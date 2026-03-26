const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const authService = require('../service/authService');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                const name = profile.displayName;
                const oauthId = profile.id;
                const avatarUrl = profile.photos?.[0]?.value || null;

                if (!email) return done(new Error('Google Account Does Not Have an Email'), null);

                const tokens = await authService.handleGoogleUser({ oauthId, email, name, avatarUrl });
                done(null, tokens);
            } catch (err) {
                done(err, null);
            }
        },
    ),
);

passport.use(
    new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, done) => {
        try {
            const user = await authService.verifyLocalLogin(email, password);
            done(null, user);
        } catch (err) {
            done(null, false, { message: err.message });
        }
    }),
);

module.exports = passport;
