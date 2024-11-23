const express = require('express');
const app = express();

// ejs 템플릿 엔진 사용
app.set('view engine', 'ejs');

// public폴더 내의 main.css를 사용하기 위함. app.use로 등록하면 css, js파일 html에 사용가능.
app.use(express.static(__dirname + '/public'));
// req.body로 유저가 보낸 정보 쉽게 처리.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let pool = require('./database.js');

// getConntection으로 한거면 release 해줘야됨 qeury로하면 자동인데.
pool
  .getConnection()
  .then((connection) => {
    connection.release();
    console.log('DB연결 성공');
    app.listen('8080', () => {
      console.log('http://localhost:8080 에서 서버 실행중');
    });
  })
  .catch((err) => {
    console.log('DB연결 실패: ', err);
  });

app.get('/', async (req, res) => {
  // 여기서 인기영화, 상영중인 영화 sql문 작성 후 넘겨주기.
  const [rows] = await pool.query(
    'SELECT m.movieId as movieId, m.title as title, m.poster as poster, COUNT(*) as bookingCnt FROM bookings b JOIN screeningMovies sm ON b.screeningMovieId = sm.screeningMovieId JOIN movies m ON sm.movieId = m.movieId GROUP BY m.movieId ORDER BY COUNT(*) desc LIMIT 3;'
  );
  const [row2] = await pool.query(
    'SELECT DISTINCT b.movieId as movieId, b.poster as poster ' +
      'FROM screeningmovies a JOIN movies b ON a.movieId = b.movieId ' +
      'WHERE a.screeningDay BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY);'
  );
  let popularMovies = rows;
  let screeningMoviePosters = row2;
  res.render('main.ejs', {
    popularMovies: popularMovies,
    screeningMoviePosters: screeningMoviePosters,
  });
});

app.use('/list', require('./routes/list.js'));
app.use('/get', require('./routes/get.js'));
app.use('/ticket', require('./routes/ticket.js'));
app.use('/error', require('./routes/error.js'));
