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
  res.render('bookingMovie.ejs', {
    result: result,
    seats: seats,
    reservedSeats: reservedSeats,
  });
});

router.post('/booking', async (req, res) => {
  const seatsArr = JSON.parse(req.body.seats);
  const screeningMovieId = req.body.screeningMovieId;
  const usrPhoneNum = req.body.phoneNumber;
  const usrPassword = req.body.pwd;

  // ture면 오류 페이지로
  if (checkVali(usrPhoneNum, usrPassword)) {
    res.redirect(
      `/error?message=${encodeURIComponent('전화번호, 비밀번호 양식 오류')}`
    );
    return;
  }
  // 입력받은 전화번호, 비밀번호가 이미 users테이블에 존재하는지.
  const [row] = await pool.query(
    'SELECT userId from users WHERE phoneNumber = ? and password = ?;',
    [usrPhoneNum, usrPassword]
  );
  let userId = row[0];
  // 없으면 유저정보를 insert
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

  // 전화번호는 같은데 비밀번호만 다르게 한건 어떻게 처리하지? -> 그냥 가능하게 할까,,, 근데 중복 전화번호에 대한 요구사항을 안정해놨었음.
  // 애초에 비회원 구매니까 걍 비밀번호만 다르면 다른 회원으로 처리 ㄱㄱ헛

  let result = [];
  let bookingIds = [];
  // 예약하기 전에 예약할려는 좌석이 screeningmovie가 상영되고 있는 관의 좌석이 맞는지 체크
  const [screeningMovieInfo] = await pool.query(
    'SELECT hallId, theaterId from screeningmovies WHERE screeningMovieId = ?',
    [screeningMovieId]
  );
  if (screeningMovieInfo === undefined) {
    res.redirect(
      `/error?message=${encodeURIComponent('상영영화가 존재하지 않습니다.')}`
    );
    return;
  }
  for (let i = 0; i < seatsArr.length; i++) {
    // bookingId는 그냥 auto incre로 처리. bookings테이블에서 예약할려는 상영영화의 자리가 이미 예약되어있는지 체크,
    const [reservedSeats] = await pool.query(
      'SELECT * FROM bookings WHERE screeningMovieId = ? and seatId = ? and hallId = ? and theaterId = ?',
      [
        screeningMovieId,
        seatsArr[i].seatId,
        seatsArr[i].hallId,
        seatsArr[i].theaterId,
      ]
    );
    if (reservedSeats.length != 0) {
      //이미 자리가 있다는 거니까 작업 취소하면 될듯.
      for (let i = 0; i < bookingIds.length; i++) {
        await pool.query('DELETE FROM bookings WHERE bookingId = ?', [
          bookingIds[i],
        ]);
      }
      res.redirect(`/error?message=${encodeURIComponent('중복좌석예약')}`);
      return;
    }
    if (
      screeningMovieInfo.rowChar !== seatsArr[i].hallId ||
      screeningMovieInfo.theaterId !== seatsArr[i].theaterId
    ) {
      // 상영하는 영화의 영화관,hall이랑 좌석의 영화관,hall이 다르면 잘못예매되는 것이니까.
      for (let i = 0; i < bookingIds.length; i++) {
        await pool.query('DELETE FROM bookings WHERE bookingId = ?', [
          bookingIds[i],
        ]);
      }
      res.redirect(
        `/error?message=${encodeURIComponent(
          '잘못된 영화관, 관의 좌석을 예약'
        )}`
      );
      return;
    }
    // 예약하기.
    const [bookingInsertResult] = await pool.query(
      'INSERT INTO bookings(bookingDate, bookingTime, screeningMovieId, userId, seatId, hallId, theaterId) values(CURDATE(), CURTIME(), ?, ?, ?, ?, ?);',
      [
        screeningMovieId,
        userId.userId,
        seatsArr[i].seatId,
        seatsArr[i].hallId,
        seatsArr[i].theaterId,
      ]
    );
    bookingIds.push(bookingInsertResult.insertId);
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

  // ture면 오류 페이지로
  if (checkVali(usrPhoneNum, usrPassword)) {
    res.redirect(
      `/error?message=${encodeURIComponent('전화번호, 비밀번호 양식 오류')}`
    );
    return;
  }

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
  } else {
    res.redirect(`/error?message=${encodeURIComponent('해당 유저 없음.')}`);
    return;
  }
  if (result.length === 0) {
    res.redirect(`/error?message=${encodeURIComponent('예약된 좌석 없음.')}`);
    return;
  } else {
    res.render('completeBooking.ejs', { tickets: result });
  }
});

function checkVali(usrPhoneNum, usrPassword) {
  const phonePattern = /^\d{3}-\d{4}-\d{4}$/;
  const passwordPattern = /^\d{4}$/;

  if (!phonePattern.test(usrPhoneNum) || !passwordPattern.test(usrPassword))
    return true;

  return false;
}
module.exports = router;
