const router = require('express').Router();
const pool = require('../database.js');

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM screeningmovies WHERE screeningMovieId = ' +
      req.query.screeningId +
      ';'
  );

  let result = rows;

  let theaterId = result[0].theaterId;
  let hallId = result[0].hallId;

  // 이거할 때 booking에서 자리조회해서 예약된건 클릭못하게 하면 될듯.
  const [rows2] = await pool.query(
    'SELECT * FROM seats WHERE ' +
      'theaterId = ' +
      theaterId +
      ' and hallId = ' +
      hallId +
      ' ORDER BY rowChar asc, colNumber asc;'
  );
  let seats = rows2;
  res.render('ticketMovie.ejs', {
    result: result,
    seats: seats,
  });
});

router.post('/booking', async (req, res) => {
  const seatsArr = JSON.parse(req.body.seats);
  const usrPhoneNum = req.body.phoneNumber;
  const usrPassword = req.body.pwd;

  console.log(usrPhoneNum);
  console.log(usrPassword);
  // 코드 이렇게 바꾸기. sql 인젝션땜에
  const [row] = await pool.query(
    'SELECT userId from users WHERE phoneNumber = ? and password = ?;',
    [usrPhoneNum, usrPassword]
  );
  let userId = row;
  if (userId.length === 0) {
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
  console.log(userId);
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
  }
  res.render('completeBooking.ejs');
});

module.exports = router;
