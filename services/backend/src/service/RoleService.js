const Repository = require('../repository/RoleRepository.js');

class RoleService {
    async getAllRoles() {
        return Repository.getAllRoles();
    }

    async updateRoleById(id, data) {
        return Repository.updateRoleById(id, data);
    }
}

module.exports = new RoleService();
