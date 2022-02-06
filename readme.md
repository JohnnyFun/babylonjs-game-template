## To make a new game

- copy `newGameTemplate.js` into games folder, rename to the name of your game
- import that from `app.js` accordingly...
- npm start

## To deploy a game

- npm run build
    - with debug panel off by default. this will build a minimized bundle.js
- Then copy the index.html and bundle.js into C:\dev\johnschottlercom\src\projects\[project-name]
- Then copy any textures you're using into C:\dev\johnschottlercom\src\textures   
  - johnschottler.com copies src/textures and src/images with webpack into the dir that it serves from
- Run johnschottlercom locally
  - `cd c:\dev\johnschottlercom && npm start` -- open https://localhost:8080
- Edit to add link to project on home page
- Stage/commit changes
- push changes (should work from devbeast since you have your ssh on devbeast in github yay)
- netlify will deploy your change automatically