## To make a new game

- copy `newGameTemplate.js` into games folder, rename to the name of your game
- import that from `app.js` accordingly...
- npm start

## To deploy a game

- npm run build
  - this will build a minimized bundle.js
  - turn debug panel off by default too in your game (see app.js)
- Copy the index.html and bundle.js into C:\dev\johnschottlercom\src\projects\[project-name]
- Copy any textures you're using into C:\dev\johnschottlercom\src\textures   
  - johnschottler.com copies src/textures and src/images with webpack into the dir that it serves from
- Run johnschottlercom locally
  - `cd c:\dev\johnschottlercom && npm start` -- open https://localhost:8080
- Edit to add link to project on home page
- push changes
- netlify will deploy your change automatically