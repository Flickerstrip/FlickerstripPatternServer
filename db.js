var Sequelize = require('sequelize');
var _ = require("underscore");
var PatternModel = require("./Pattern.js");
var fs = require("fs");
var path = require("path");

var env       = process.env.NODE_ENV || "development";
var config    = require(path.join(__dirname, 'config', 'config.json'))[env];

var forceSync = false;

module.exports = (function () {
    this.sequelize = new Sequelize(config.database, config.username, config.password, config);

    this.phpbb = new Sequelize(config.phpbb.database, config.phpbb.username, config.phpbb.password, config.phpbb);
    this.phpbb.sync().then(function() {});

    this.Users = this.sequelize.define('Users', {
      email: Sequelize.STRING,
      display: Sequelize.STRING,
      lastlogin: Sequelize.DATE,
      phpbbId: Sequelize.INTEGER,
    });

    this.Patterns = this.sequelize.define('Patterns', {
      name: Sequelize.STRING,
      type: Sequelize.STRING,
      fps: Sequelize.FLOAT,
      frames: Sequelize.INTEGER,
      pixels: Sequelize.INTEGER,
      published: Sequelize.BOOLEAN,
    });
    this.Patterns.belongsTo(this.Users, {as: 'Owner'});

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

    this.Patterns.belongsToMany(this.Users, {as: "Vote", through: this.UserVotes});
    this.Users.belongsToMany(this.Patterns, {as: "Vote", through: this.UserVotes});

    this.PatternScores = this.sequelize.define('PatternScores',{
        patternId: {
            type: Sequelize.INTEGER,
            primaryKey: true,
        },
        votes: Sequelize.INTEGER,
        points: Sequelize.INTEGER,
        upvotes: Sequelize.INTEGER,
        downvotes: Sequelize.INTEGER,
        score: Sequelize.DOUBLE,
    },{
        timestamps: false,
    });
    this.Patterns.hasOne(this.PatternScores,{foreignKey:"patternId"});

    this.sequelize.sync({"force":forceSync}).then(function() {
        console.log("synced");

/*
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
*/
    });

    return this;
})()
