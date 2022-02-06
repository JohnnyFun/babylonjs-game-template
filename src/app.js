import '@babylonjs/core/Debug/debugLayer'
import '@babylonjs/inspector'

import { Engine } from '@babylonjs/core'
import game from './games/pink-boy-ball'

// import game from './games/vrTank'
// import game from './games/spaceboy'
// import game from './games/vrShooter'
// import game from './games/mazeboy'
// import game from './games/weinerboy'


// import gettingStartedScene from './tutorials/gettingStartedScene'
// import divingDeeperAnimation from './tutorials/divingDeeperAnimation'

let canvas
let engine
let scene
main()

async function main() {
  buildEngineOnCanvas()
  await setScene(game)
  engine.runRenderLoop(() => scene.render())
}

function buildEngineOnCanvas() {
  // common foundation of any babylon app
  canvas = document.querySelector('canvas')
  engine = new Engine(canvas)
  window.addEventListener('resize', () => engine.resize())
}

// You can have multiple scenes (cut scenes, loading scenes, game scenes, etc.)
// Related: can pre-load scenes while showing a simple scene
async function setScene(sceneBuilder) {
  const newScene = await sceneBuilder(engine, canvas)
  scene?.dispose()
  scene = newScene
  enableDebugTools(true)
}

function enableDebugTools(enabledByDefault) {
  // handy ui for inspecting/modifying meshes and other stuff that's loaded on the page
  if (enabledByDefault) scene.debugLayer.show()
  window.addEventListener('keydown', ev => {
    // Shift+Ctrl+Alt+I to turn on debug inspector controls
    if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.key === 'I') {
      if (scene.debugLayer.isVisible()) scene.debugLayer.hide()
      else scene.debugLayer.show()
    }
  })
}