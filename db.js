var Sequelize = require('sequelize');
var credentials = require('./credentials.js');
var _ = require("underscore");
var PatternModel = require("./Pattern.js");
var fs = require("fs");

var forceSync = false;

module.exports = function () {
    this.sequelize = new Sequelize(credentials.database,credentials.user,credentials.password,{
        host:credentials.host,
        port:credentials.port,
        logging: false
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

    this.PatternPixelData = this.sequelize.define('PatternPixelData', {
        data: Sequelize.BLOB('long')
    });
    this.Patterns.hasOne(this.PatternPixelData,{foreignKeyConstraint: true, onDelete: 'cascade'});
    this.PatternPixelData.belongsTo(this.Patterns,{onDelete:"CASCADE",foreignKeyConstraint: true});

    this.PatternCodeSnippets = this.sequelize.define('PatternCodeSnippets', {
        data: Sequelize.BLOB('long')
    });
    this.Patterns.hasOne(this.PatternCodeSnippets,{foreignKeyConstraint: true, onDelete: 'cascade'});
    this.PatternCodeSnippets.belongsTo(this.Patterns,{onDelete:"CASCADE",foreignKeyConstraint: true});

    this.UserVotes = sequelize.define('UserVotes', {
        score: Sequelize.INTEGER
    })

    this.Patterns.belongsToMany(this.Users, {as: 'Votes', through: this.UserVotes});
    this.Users.belongsToMany(this.Patterns, {as: 'Votes', through: this.UserVotes});

    this.sequelize.sync({"force":forceSync}).then(function() {
        console.log("synced");

        console.log("running migration");
        Patterns.findAll().then(function(patterns) {
            _.each(patterns,function(pattern) {
                PatternData.findOne({where:{patternId:pattern.id}}).then(function(patterndata) {
                    if (pattern.type) {
                        var type = pattern.type;

                        var o = new PatternModel();
                        o.name = pattern.name;
                        o.id = pattern.id;
                        o.OwnerId = pattern.OwnerId;
                        o.fps = pattern.fps;
                        o.pixels = pattern.pixels;
                        o.frames = pattern.frames;
                        //TODO address palette
                        if (type == "bitmap") {
                            //move the bitmap body data into PatternPixelData
                            PatternPixelData.create({
                                data:patterndata.data,
                            }).then(function(pixelData) {
                                pixelData.setPattern(pattern);
                                pattern.updateAttributes({
                                  type: null
                                });
                                patterndata.destroy();
                            });
                        } else {
                            var code = patterndata.data;
                            o.code = code;
                            o.renderJavascriptPattern();
                            var pixelBlob = new Buffer(o.pixelData);

                            PatternPixelData.create({
                                data:pixelBlob,
                            }).then(function(patternPixelData) {
                                patternPixelData.setPattern(pattern);
                                PatternCodeSnippets.create({
                                    data:new Buffer(o.code),
                                }).then(function(patternCode) {
                                    patternCode.setPattern(pattern);
                                    pattern.updateAttributes({
                                      fps:o.fps,
                                      pixels:o.pixels,
                                      frames:o.frames,
                                      type: null
                                    });
                                    patterndata.destroy();
                                });
                            });
                        }
                    }
                });
            });
        });
    });
}()
