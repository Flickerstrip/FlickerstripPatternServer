'use strict';

module.exports = {
    up: function(queryInterface, Sequelize) {
        queryInterface.addColumn(
            'Patterns',
            'published', {
                type:Sequelize.BOOLEAN,
                defaultValue: false,
            }
        )
    },
 
    down: function(queryInterface, Sequelize) {
        queryInterface.removeColumn('Patterns', 'published')
    }
}

