const router = require('express').Router();
const pool = require('../database.js');

// 여기로 요청오면 영화관들 보여주고
router.get('/area', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT province, count(*) as theaterNumber FROM theaters GROUP BY province'
  );
  let result = rows;
  res.render('listArea.ejs', {
    province: result,
  });
});
// /list/movie로 오는 요청들은 상영영화 얻는거임.

// 여기로 get요청 오면 전체 상영영화 얻고. 그 상영영화 클릭하면 상영되는 영화관들 보여주기하면 될 듯.
router.get('/movie', async (req, res) => {
  // 현재 상영중인 영화의 이름과 ID값. 이걸로 나중에 해당영화의 ID로 뭐 찾기하면 될듯.
  // 영화 이름, 개봉일 이런거 about에 보여줄거니까 추가해놓으셈.
  const [rows] = await pool.query(
    'SELECT DISTINCT b.movieId as movieId, b.title as title, b.synopsis as synopsis, DATE_FORMAT(b.releaseDate, "%Y년 %m월 %d일") as releaseDate, b.runningTime as runningTime FROM screeningmovies a JOIN movies b ON a.movieId = b.movieId;'
  );
  let result = rows;
  res.render('listMovie.ejs', { result: result });
});

// a에 대한걸로 where절요. a = 영화관 theaterId임. theaterId를 가지고 있는 상영영화 얻으면 될 듯.
router.get('/movie/:a', async (req, res) => {
  // 현재 상영중인 영화의 이름과 ID값. 이걸로 나중에 해당영화의 ID로 뭐 찾기하면 될듯.
  // 근데 이제 movieId가 qeury string으로 들어왔을 때는 해당 movieId만 있는걸로 찾기.
  let q =
    'SELECT DISTINCT ' +
    'a.screeningMovieId as screeningId, b.title as title, b.movieId as movieId, DATE_FORMAT(a.screeningDay, "%Y년 %m월 %d일") as screeningDay, ' +
    'a.startTime as startTime, b.runningTime as runningTime, TIME(SEC_TO_TIME(TIME_TO_SEC(b.runningTime) + TIME_TO_SEC(a.startTime))) as endTime, ' +
    'c.hallName as hallName, c.hallId as hallId ' +
    'FROM screeningmovies a JOIN movies b ON a.movieId = b.movieId JOIN halls c on a.hallId = c.hallId and a.theaterId = c.theaterId ' +
    'WHERE a.theaterId = ' +
    req.params.a +
    ' and a.movieId';
  if (req.query.movieId) {
    q += ' = ' + req.query.movieId;
  }
  q += ' ORDER BY screeningDay ASC, startTime ASC;';
  const [rows] = await pool.query(q);
  let result = rows;

  const [rows2] = await pool.query(
    'SELECT theaterName from theaters where theaterId = ' + req.params.a
  );
  let theaterName = rows2;
  res.render('listScreeningMovie.ejs', {
    result: result,
    theaterId: req.params.a,
    theaterName: theaterName[0].theaterName,
  });
});

module.exports = router;
