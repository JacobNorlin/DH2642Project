# DH2642 Project
This project implements a lobby service for gamers.

In a lobby users can add games they want to play and times when they're available and how many users each of their games requires. When enough users have the same game, those users are alerted that they have enough players.

Users create rooms by going to the main site (e.g localhost:3001), which automatically creates a room (e.g localhost:3001/WgTrStgC), the user can then invite his friends by sharing the URL to them.

Box art for the games is grabbed from giantbomb's API (www.giantbomb.com). 

#Installation and execution
    npm install
    node app.js

## TODO
* Serverside checks for timeline & games abuse
* Notify users when a game has enough players
* Polish interaction
