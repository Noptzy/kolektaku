process.env.DATABASE_URL = 'dummy';

jest.mock('../../src/repository/userRepository');
jest.mock('../../src/service/tokenService');
jest.mock('../../src/service/emailService');
jest.mock('bcryptjs');

const authService = require('../../src/service/authService');
const userRepository = require('../../src/repository/userRepository');
const tokenService = require('../../src/service/tokenService');
const emailService = require('../../src/service/emailService');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../../src/repository/userRepository');
jest.mock('../../src/service/tokenService');
jest.mock('../../src/service/emailService');
jest.mock('bcryptjs');

describe('AuthService Unit Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('verifyLocalLogin', () => {
        it('should return user object if email and password are correct', async () => {
            // Mock data
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password: 'hashed_password_123'
            };

            // Setup mocks
            userRepository.findUserByEmail.mockResolvedValueOnce(mockUser);
            bcrypt.compare.mockResolvedValueOnce(true);

            // Execute function
            const result = await authService.verifyLocalLogin('test@example.com', 'mypassword');

            // Assertions
            expect(userRepository.findUserByEmail).toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.compare).toHaveBeenCalledWith('mypassword', 'hashed_password_123');
            expect(result).toEqual(mockUser);
        });

        it('should throw error if email is not found', async () => {
            userRepository.findUserByEmail.mockResolvedValueOnce(null);

            await expect(authService.verifyLocalLogin('notfound@example.com', 'pass'))
                .rejects
                .toMatchObject({ message: 'Email Not Found', status: 401 });
        });

        it('should throw error if user uses google login (no password inside db)', async () => {
            userRepository.findUserByEmail.mockResolvedValueOnce({
                id: 2,
                email: 'google@example.com',
                password: null // Google user
            });

            await expect(authService.verifyLocalLogin('google@example.com', 'pass'))
                .rejects
                .toMatchObject({ message: 'This Account Uses Google Login', status: 401 });
        });

        it('should throw error if password does not match', async () => {
            userRepository.findUserByEmail.mockResolvedValueOnce({
                id: 3,
                email: 'wrong@example.com',
                password: 'real_hashed_password'
            });
            bcrypt.compare.mockResolvedValueOnce(false); // Wrong password simulated

            await expect(authService.verifyLocalLogin('wrong@example.com', 'wrong_pass'))
                .rejects
                .toMatchObject({ message: 'Password Is Wrong', status: 401 });
        });
    });

    describe('register', () => {
        it('should register a new user successfully and send welcome email', async () => {
            userRepository.findUserByEmail.mockResolvedValueOnce(null);
            bcrypt.hash.mockResolvedValueOnce('new_hashed_pass');
            
            const mockStoredUser = { id: 10, email: 'new@example.com', name: 'New User' };
            userRepository.storeUser.mockResolvedValueOnce(mockStoredUser);
            emailService.sendWelcome.mockResolvedValueOnce();

            const result = await authService.register({
                email: 'new@example.com',
                name: 'New User',
                password: 'secret_password'
            });

            expect(result).toEqual({ id: 10, email: 'new@example.com', name: 'New User' });
            expect(bcrypt.hash).toHaveBeenCalledWith('secret_password', 10);
            expect(userRepository.storeUser).toHaveBeenCalledWith({
                email: 'new@example.com',
                name: 'New User',
                password: 'new_hashed_pass'
            });
            expect(emailService.sendWelcome).toHaveBeenCalledWith('new@example.com', 'New User');
        });

        it('should throw error if email is already taken', async () => {
            userRepository.findUserByEmail.mockResolvedValueOnce({ id: 99, email: 'taken@example.com' });

            await expect(authService.register({ email: 'taken@example.com', name: 'Joe', password: '123' }))
                .rejects
                .toMatchObject({ message: 'Email Has Been Taken', status: 409 });
        });
    });
});
