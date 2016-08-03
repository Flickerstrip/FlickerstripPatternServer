'use strict';

module.exports = {
    up: function (queryInterface, Sequelize) {
        queryInterface.addColumn(
            'Users',
            'phpbbId', {
                type:Sequelize.INTEGER,
            }
        )
    },

    down: function (queryInterface, Sequelize) {
        queryInterface.removeColumn('Patterns', 'published')
    }
};
