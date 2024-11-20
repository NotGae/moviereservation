const router = require('express').Router();
const pool = require('../database.js');
const moment = require('moment');

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM screeningmovies WHERE screeningMovieId = ?;',
    [req.query.screeningId]
  );

  let result = rows;

  let theaterId = result[0].theaterId;
  let hallId = result[0].hallId;

  // 이거할 때 booking에서 자리조회해서 예약된건 클릭못하게 하면 될듯.
  const [rows2] = await pool.query(
    'SELECT * FROM seats WHERE hallId = ? and theaterId = ? ORDER BY rowChar asc, colNumber asc;',
    [hallId, theaterId]
  );

  // 이거할 때 booking에서 자리조회 이미 screeningMovies에 hall이랑 theater이 있음. 따로 WHERE안해도 될듯.
  const [row3] = await pool.query(
    'SELECT seatId FROM bookings WHERE screeningMovieId = ?',
    [req.query.screeningId]
  );
  let seats = rows2;
  let reservedSeats = row3; // 예약된 자리.
  res.render('ticketMovie.ejs', {
    result: result,
    seats: seats,
    reservedSeats: reservedSeats,
  });
});

//예약들어왔을 때 이미 예약된 자리인지 체크하는거 만들기.
router.post('/booking', async (req, res) => {
  const seatsArr = JSON.parse(req.body.seats);
  const usrPhoneNum = req.body.phoneNumber;
  const usrPassword = req.body.pwd;

  // 코드 이렇게 바꾸기. sql 인젝션땜에
  const [row] = await pool.query(
    'SELECT userId from users WHERE phoneNumber = ? and password = ?;',
    [usrPhoneNum, usrPassword]
  );
  let userId = row[0];
  if (userId === undefined) {
    await pool.query('INSERT INTO users(phoneNumber, password) values(?, ?);', [
      usrPhoneNum,
      usrPassword,
    ]);
    const [row2] = await pool.query(
      'SELECT userId from users WHERE phoneNumber = ? and password = ?;',
      [usrPhoneNum, usrPassword]
    );
    // 이제 id있음.
    userId = row2[0];
  }
  let result = [];
  for (let i = 0; i < seatsArr.length; i++) {
    // 넣기 전에 먼저 users테이블에서 찾기. 없으면 users테이블에 삽입 후 해당 id 가져오기.
    // bookingId는 그냥 auto incre로 처리
    await pool.query(
      'INSERT INTO bookings(bookingDate, bookingTime, screeningMovieId, userId, seatId, hallId, theaterId) values(CURDATE(), CURTIME(), ?, ?, ?, ?, ?);',
      [
        seatsArr[i].screeningMovieId,
        userId.userId,
        seatsArr[i].seatId,
        seatsArr[i].hallId,
        seatsArr[i].theaterId,
      ]
    );
    const [theaterName] = await pool.query(
      'SELECT theaterName FROM theaters WHERE theaterId = ?',
      [seatsArr[i].theaterId]
    );
    const [hallName] = await pool.query(
      'SELECT hallName FROM halls WHERE hallId = ? and theaterId = ?',
      [seatsArr[i].hallId, seatsArr[i].theaterId]
    );
    const [seatCode] = await pool.query(
      'SELECT rowChar, colNumber FROM seats WHERE seatId = ? and hallId = ? and theaterId = ?',
      [seatsArr[i].seatId, seatsArr[i].hallId, seatsArr[i].theaterId]
    );
    const [movieInfo] = await pool.query(
      'SELECT DISTINCT b.title as title, a.startTime as startTime, DATE_FORMAT(a.screeningDay, "%Y년 %m월 %d일") as screeningDay, b.runningTime as runningTime FROM screeningmovies a JOIN movies b ON a.movieId = b.movieId WHERE a.screeningMovieId = ?;',
      [seatsArr[0].screeningMovieId]
    );
    result.push({
      movieInfo: movieInfo[0],
      hallName: hallName[0].hallName,
      theaterName: theaterName[0].theaterName,
      seatCode: seatCode[0].rowChar + seatCode[0].colNumber,
      date: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
  }
  res.render('completeBooking.ejs', {
    tickets: result,
  });
});

router.get('/find', (req, res) => {
  res.render('findTicketInfo.ejs');
});
router.post('/search', async (req, res) => {
  const usrPhoneNum = req.body.phoneNumber;
  const usrPassword = req.body.pwd;
  const [row] = await pool.query(
    'SELECT userId from users WHERE phoneNumber = ? and password = ?;',
    [usrPhoneNum, usrPassword]
  );
  let userId = row.length > 0 ? row[0].userId : '';
  let result = [];
  if (userId !== '') {
    const [tickets] = await pool.query(
      'SELECT seatId, hallId, theaterId, DATE_FORMAT(bookingDate, "%Y년 %m월 %d일") as bookingDate, bookingTime, screeningMovieId FROM bookings WHERE userId = ?',
      [userId]
    );
    //result = tickets;
    for (let i = 0; i < tickets.length; i++) {
      let seatId = tickets[i].seatId;
      let hallId = tickets[i].hallId;
      let theaterId = tickets[i].theaterId;
      let screeningMovieId = tickets[i].screeningMovieId;
      let date = tickets[i].bookingDate + ' ' + tickets[i].bookingTime;

      const [theaterName] = await pool.query(
        'SELECT theaterName FROM theaters WHERE theaterId = ?',
        [theaterId]
      );
      const [hallName] = await pool.query(
        'SELECT hallName FROM halls WHERE hallId = ? and theaterId = ?',
        [hallId, theaterId]
      );
      const [seatCode] = await pool.query(
        'SELECT rowChar, colNumber FROM seats WHERE seatId = ? and hallId = ? and theaterId = ?',
        [seatId, hallId, theaterId]
      );
      const [movieInfo] = await pool.query(
        'SELECT DISTINCT b.title as title, a.startTime as startTime, DATE_FORMAT(a.screeningDay, "%Y년 %m월 %d일") as screeningDay, b.runningTime as runningTime FROM screeningmovies a JOIN movies b ON a.movieId = b.movieId WHERE a.screeningMovieId = ?;',
        [screeningMovieId]
      );
      result.push({
        movieInfo: movieInfo[0],
        hallName: hallName[0].hallName,
        theaterName: theaterName[0].theaterName,
        seatCode: seatCode[0].rowChar + seatCode[0].colNumber,
        date: date,
      });
    }
  }
  if (result.length === 0) {
    res.redirect('/ticket/find');
  } else {
    res.render('completeBooking.ejs', { tickets: result });
  }
});
module.exports = router;
