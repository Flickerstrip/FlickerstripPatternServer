'use strict';

//See link for rating calculations
//http://www.evanmiller.org/how-not-to-sort-by-average-rating.html

//Magical SQL query to list scores:
//SELECT *,((upvotes + 1.9208) / (upvotes + downvotes) - 1.96 * SQRT((upvotes * downvotes) / (upvotes + downvotes) + 0.9604) / (upvotes + downvotes)) / (1 + 3.8416 / (upvotes + downvotes)) as score FROM (SELECT patternId,COUNT(*) as votes,sum(score=1) AS upvotes,sum(score=-1) AS downvotes FROM UserVotes GROUP BY patternId) as counts ORDER BY score DESC;

//SQL to create views to do the same:
//CREATE VIEW PatternVoteCounts AS SELECT patternId,COUNT(*) as votes,sum(score=1) AS upvotes,sum(score=-1) AS downvotes FROM UserVotes GROUP BY patternId;
//CREATE VIEW PatternScores AS 
//   SELECT *,
//   ((upvotes + 1.9208) / (upvotes + downvotes) - 1.96 * SQRT((upvotes * downvotes) / (upvotes + downvotes) + 0.9604) / (upvotes + downvotes)) / (1 + 3.8416 / (upvotes + downvotes)) as score
//   FROM PatternVoteCounts as counts ORDER BY score DESC;

module.exports = {
    up: function (queryInterface, Sequelize) {
        queryInterface.sequelize.query("CREATE VIEW PatternVoteCounts AS SELECT patternId,COUNT(*) as votes,sum(score) AS points,sum(score=1) AS upvotes,sum(score=-1) AS downvotes FROM UserVotes GROUP BY patternId");
        queryInterface.sequelize.query("CREATE VIEW PatternScores AS SELECT *, ((upvotes + 1.9208) / (upvotes + downvotes) - 1.96 * SQRT((upvotes * downvotes) / (upvotes + downvotes) + 0.9604) / (upvotes + downvotes)) / (1 + 3.8416 / (upvotes + downvotes)) as score FROM PatternVoteCounts as counts ORDER BY score DESC");
  },

  down: function (queryInterface, Sequelize) {
        queryInterface.sequelize.query("DROP VIEW PatternScores");
        queryInterface.sequelize.query("DROP VIEW PatternVoteCounts");
  }
};
