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
  console.log(req.body);
  //여기서 이제 거의 다 된듯
  res.render('completeBooking.ejs');
});

module.exports = router;
