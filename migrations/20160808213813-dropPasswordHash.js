'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        queryInterface.removeColumn('Users', 'passwordHash')
    },
 
    down: function(queryInterface, Sequelize) {
        queryInterface.addColumn(
            'Users',
            'passwordHash', {
                type:Sequelize.STRING,
                defaultValue: null,
            }
        )
    }
};
