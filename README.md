영화애매 웹

public폴더: css, js, html등등

routes폴더: api
get.js -> ajax로 정보처리
list.js -> 영화정보 리스트 처리
ticket.js -> 예매 처리
error.js -> 오류처리.

views폴더: ejs파일들
main.ejs : 웹페이지 시작 화면
listScreeningMovie.ejs : 한 영화관에서 상영되는 영화들 보여주는 화면
listMovie.ejs: 전체 영화관에서 상영되는 영화들 보여주는 화면
listArea.ejs: 영화관을 지역별로 볼 수 있는 화면
findTicketInfo.ejs : 예매한 티켓정보를 찾아볼 수 있는 화면
completeBooking.ejs : 예약완료 화면. 예약한 티켓을 봄
bookingMovie.ejs : 영화를 예매하는 화면. 좌석을 고를 수 있음.
error.ejs : 에러화면

server.js -> 서버
database.js -> 데이터베이스

https://github.com/NotGae/moviereservation