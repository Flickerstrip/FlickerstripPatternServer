'use strict';

module.exports = {
    up: function (queryInterface, Sequelize) {
        queryInterface.dropTable("PatternData");
    },

    down: function (queryInterface, Sequelize) {
        queryInterface.createTable("PatternData",{
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            createdAt: {
                type: Sequelize.DATE
            },
            updatedAt: {
                type: Sequelize.DATE
            },
            data: Sequelize.BLOB,
            PatternId: Sequelize.INTEGER,
        });
    }
};

/*
   | id        | int(11)  | NO   | PRI | NULL    | auto_increment |
   | data      | blob     | YES  |     | NULL    |                |
   | createdAt | datetime | NO   |     | NULL    |                |
   | updatedAt | datetime | NO   |     | NULL    |                |
   | PatternId | int(11)  | YES  | MUL | NULL    |                | -- Not adding the constraints back on delete
 */
