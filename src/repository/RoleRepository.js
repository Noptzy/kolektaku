const prisma = require('../config/prisma');

class RoleRepository {
    async getAllRoles(tx = prisma) {
        const roles = await tx.role.findMany({
            orderBy: { id: 'asc' },
            where: { 
                id : { not: 1 } 
            }, // Exclude Super Admin
        });
        return roles;
    }

    async updateRoleById(id, data, tx = prisma) {
        const role = await tx.role.update({
            where: { id },
            data: {
                title: data.title,
            },
        });

        return role;
    }

}

module.exports = new RoleRepository();
