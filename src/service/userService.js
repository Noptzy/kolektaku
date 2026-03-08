const userRepository = require('../repository/userRepository');
const bcrypt = require('bcryptjs');

class UserService {
    async getAllUsers(page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            userRepository.findAllUsers({ skip, take: limit }),
            userRepository.countUsers(),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data: users,
            total,
            page,
            limit,
            totalPages,
        };
    }

    async getUserById(id) {
        return userRepository.findUserById(id);
    }

    async getUserByEmail(email) {
        return userRepository.findUserByEmail(email);
    }

    async createUser(data) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return userRepository.storeUser({ ...data, password: hashedPassword });
    }

    async updateUser(id, data) {
        if (data.password) {
            data.password = await bcrypt.hash(data.password, 10);
        }
        return userRepository.updateUser(id, data);
    }

    async deleteUser(id) {
        return userRepository.deleteUser(id);
    }
}

module.exports = new UserService();
