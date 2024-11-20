const router = require('express').Router();
const pool = require('../database.js');

router.get('/city', async (req, res) => {
  const province = req.query.provinceName;
  let q =
    'SELECT city, count(*) as theaterNumber FROM theaters where province = ? GROUP BY city;';
  const [rows] = await pool.query(q, [province]);
  const result = rows;
  res.send(result);
});
router.get('/theater', async (req, res) => {
  const city = req.query.cityName;
  let q = 'SELECT theaterId, theaterName FROM theaters where city = ?;';
  const [rows] = await pool.query(q, [city]);
  const result = rows;
  res.send(result);
});

router.get('/parentTheater', async (req, res) => {
  const MOVIEID = req.query.movieId;
  let q =
    'SELECT DISTINCT b.theaterId as theaterId, b.theaterName as theaterName, b.city as city, b.province as province FROM screeningmovies a JOIN theaters b ON a.theaterId = b.theaterId WHERE a.movieId = ?';

  const [rows] = await pool.query(q, [MOVIEID]);
  const result = rows;
  res.send(result);
});

module.exports = router;
