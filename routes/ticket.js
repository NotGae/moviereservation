const router = require('express').Router();
const pool = require('../database.js');

router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT screeningMovie FROM screeningmovies WHERE screeningMovieId = ' +
      req.query.screeningId +
      ';'
  );

  let result = rows;
  res.render('ticketMovie.ejs', {
    result: result,
  });
});

module.exports = router;
