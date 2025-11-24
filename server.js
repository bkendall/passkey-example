import 'dotenv/config';
import express from 'express';
import { LRUCache } from 'lru-cache';
import cookieParser from 'cookie-parser';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import crypto from 'crypto';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Storage
// Users: Map<username, { id: string, username: string, devices: Authenticator[] }>
// Challenges: Map<userId, challenge> (short-lived)
const userCache = new LRUCache({
    max: 100,
    ttl: 1000 * 60 * 60 * 24, // 24 hours
});

// Store challenges temporarily
const challengeCache = new LRUCache({
    max: 1000,
    ttl: 1000 * 60 * 5, // 5 minutes
});

// Helper to get user by username (simulating DB lookup)
function getUserByUsername(username) {
    return userCache.get(username);
}

// Helper to create user
function createUser(username) {
    const user = {
        id: crypto.randomUUID(),
        username,
        devices: [],
    };
    userCache.set(username, user);
    return user;
}

// RP (Relying Party) settings
const rpName = 'Passkey Demo';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.EXPECTED_ORIGIN || `http://${rpID}:${port}`;

/**
 * Registration
 */
app.post('/register/options', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    let user = getUserByUsername(username);
    if (!user) {
        user = createUser(username);
    }

    const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: new Uint8Array(Buffer.from(user.id)),
        userName: user.username,
        // Don't exclude credentials for this demo to allow re-registration easier,
        // but in production you might want to exclude existing devices.
        attestationType: 'none',
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred',
            authenticatorAttachment: 'platform',
        },
    });

    // Save challenge to verify later
    challengeCache.set(user.id, options.challenge);

    res.json(options);
});

app.post('/register/verify', async (req, res) => {
    const { username, response } = req.body;
    const user = getUserByUsername(username);

    if (!user) {
        return res.status(400).json({ error: 'User not found' });
    }

    const expectedChallenge = challengeCache.get(user.id);
    if (!expectedChallenge) {
        return res.status(400).json({ error: 'Challenge expired or not found' });
    }

    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
        const { credential } = registrationInfo;
        const {
            id: credentialID,
            publicKey: credentialPublicKey,
            counter,
        } = credential;

        const newDevice = {
            credentialPublicKey,
            credentialID,
            counter,
            transports: response.response.transports,
        };

        user.devices.push(newDevice);
        userCache.set(username, user); // Update user in cache
        challengeCache.delete(user.id); // Cleanup challenge

        return res.json({ verified: true });
    }

    res.status(400).json({ verified: false });
});

/**
 * Authentication (Login)
 */
app.post('/login/options', async (req, res) => {
    const { username } = req.body;
    // Note: In a real "usernameless" flow, we wouldn't need username here necessarily,
    // but for this simple demo we ask for it to look up the user.

    const user = getUserByUsername(username);
    if (!user) {
        return res.status(400).json({ error: 'User not found' });
    }

    const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: user.devices.map((device) => ({
            id: device.credentialID,
            type: 'public-key',
            transports: device.transports,
        })),
        userVerification: 'preferred',
    });

    challengeCache.set(user.id, options.challenge);

    res.json(options);
});

app.post('/login/verify', async (req, res) => {
    const { username, response } = req.body;
    const user = getUserByUsername(username);

    if (!user) {
        return res.status(400).json({ error: 'User not found' });
    }

    const expectedChallenge = challengeCache.get(user.id);
    if (!expectedChallenge) {
        return res.status(400).json({ error: 'Challenge expired or not found' });
    }

    let verification;
    try {
        const device = user.devices.find((d) => d.credentialID === response.id);
        if (!device) {
            throw new Error('Authenticator not found for this user');
        }

        verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: device.credentialID,
                publicKey: device.credentialPublicKey,
                counter: device.counter,
                transports: device.transports,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
        // Update counter
        const device = user.devices.find((d) => d.credentialID === response.id);
        device.counter = authenticationInfo.newCounter;
        userCache.set(username, user);
        challengeCache.delete(user.id);

        // Set session cookie
        res.cookie('username', username, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24,
        });
        return res.json({ verified: true });
    }

    res.status(400).json({ verified: false });
});

app.post('/logout', (req, res) => {
    res.clearCookie('username');
    res.json({ success: true });
});

app.get('/me', (req, res) => {
    const username = req.cookies.username;
    if (username && userCache.has(username)) {
        return res.json({ loggedIn: true, username });
    }
    res.json({ loggedIn: false });
});

app.listen(port, () => {
    console.log(`Server listening at ${origin}`);
});
