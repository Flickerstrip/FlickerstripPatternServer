var Sequelize = require('sequelize');
var credentials = require('./credentials.js');

var forceSync = false;

module.exports = function () {
    this.sequelize = new Sequelize(credentials.database,credentials.user,credentials.password,{
        host:credentials.host,
        port:credentials.port
    });

    this.Users = this.sequelize.define('Users', {
      email: Sequelize.STRING,
      display: Sequelize.STRING,
      passwordHash: Sequelize.STRING,
      lastlogin: Sequelize.DATE,
    });

    this.Patterns = this.sequelize.define('Patterns', {
      name: Sequelize.STRING,
      type: Sequelize.STRING,
      fps: Sequelize.FLOAT,
      frames: Sequelize.INTEGER,
      pixels: Sequelize.INTEGER
    });
    this.Patterns.belongsTo(this.Users, {as: 'Owner'});

    this.PatternData = this.sequelize.define('PatternData', {
        data: Sequelize.BLOB
    });
    this.Patterns.hasOne(this.PatternData,{foreignKeyConstraint: true, onDelete: 'cascade'});
    this.PatternData.belongsTo(this.Patterns,{onDelete:"CASCADE",foreignKeyConstraint: true});

    this.UserVotes = sequelize.define('UserVotes', {
        score: Sequelize.INTEGER
    })

    this.Patterns.belongsToMany(this.Users, {as: 'Votes', through: this.UserVotes});
    this.Users.belongsToMany(this.Patterns, {as: 'Votes', through: this.UserVotes});

    this.sequelize.sync({"force":forceSync}).then(function() {
        console.log("synced");
    });
}()
