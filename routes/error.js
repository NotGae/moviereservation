const router = require('express').Router();

router.get('/', (req, res) => {
  res.render('error.ejs', { errorMessage: req.query.message });
});

module.exports = router;
