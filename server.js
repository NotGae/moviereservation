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

app.get('/', (req, res) => {
  res.render('main.ejs');
});

app.use('/list', require('./routes/list.js'));
app.use('/get', require('./routes/get.js'));
