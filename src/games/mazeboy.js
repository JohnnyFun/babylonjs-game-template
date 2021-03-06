// TODO: implement gravity (collisions work!!!)
// TODO: export fountain to .babylon and import instead...
// TODO: build proof of concept extruded maze line wall
// TODO: THEN, give ability to build custom mazes by drawing in different scene with mouse pointer!
// TODO: use device controls instead of action controls to work on mac?
// TODO: make character collision box bigger? For walls?
// TODO: add jump animation, hook to space bar, give him some stuff to jump over/onto
// TODO: add falling animation, if falls off platform or if about to fall really far before hitting ground, sound "Oh shit" and when hit ground "uhhh" and make a thud sound maybe
// TODO: add to personal site with desc: "In this game, you are Pinkboy. He hasn't slept for several days because he's absolutely obsessed with completing mazes that you build for him."
// TODO: also add your VR game and assert it works in oculus mask.

import { ActionManager, ArcRotateCamera, Axis, Color3, Color4, ExecuteCodeAction, FollowCamera, HemisphericLight, Mesh, MeshBuilder, ParticleSystem, Scene, SceneLoader, StandardMaterial, Texture, TransformNode, Vector3 } from '@babylonjs/core'

let canvas
let scene
let camera
let light
let inputMap = {}
let ground
let wallMaterial
let mazeWalls = JSON.parse(window.localStorage.getItem('maze') ?? '[]')
let newWall
let character
let characterSpeed = .2
let characterRotationSpeed = .05

export default async function create(engine, canvas) {
  canvas = canvas
  scene = new Scene(engine)
  light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
  await addCharacter()
  addCamera()
  addGround()
  addInputTracking()
  addFountain()
  addMaze()
  return scene
}

function enableDrawMaze() {
  let drawing = false
  let throttle = null
  scene.onPointerDown = () => {
    drawing = true
    newWall = []
    mazeWalls.push(newWall)
  }
  scene.onPointerMove = () => {
    if (!drawing)
      return
    const pickResult = scene.pick(scene.pointerX, scene.pointerY)
    if (pickResult.hit && pickResult.pickedMesh === ground) {
      const x = pickResult.pickedPoint.x
      const z = pickResult.pickedPoint.z
      // clearTimeout(throttle)
      // throttle = setTimeout(() => {
        console.log(x, z)
        newWall.push([x, z])
        setMaze()
      // }, 1000)
    }
  }
  scene.onPointerUp = () => {
    drawing = false
  }
}

function addMaze() {
  wallMaterial = new StandardMaterial('wallMaterial', scene)
  wallMaterial.ambientTexture = new Texture('/textures/logwall.jpg', scene)
  // const path = [
  //   [-30, -30],
  //   [0, -30],
  //   [10, -20],
  // ].map(p => new Vector3(p[0], 0, p[1]))
  setMaze()
}

function setMaze() {
  window.localStorage.setItem('maze', JSON.stringify(mazeWalls))
  console.log(mazeWalls)
  const height = 10
  const width = 1
  const shape = [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
    [0, 0],
  ].map(p => new Vector3(p[0], p[1], 0))
  try {
    for (const wall of mazeWalls) {
      const path = wall.map(point => new Vector3(point[0], 0, point[1]))
      const mazeWall = MeshBuilder.ExtrudeShape('maze', {
        shape,
        path,
        updatable: true, // so we can add to it as the user ray casts they're desired shape!
      }, scene)
      mazeWall.material = wallMaterial
      mazeWall.checkCollisions = true
    }
    // TODO make all maze walls combined mesh for perf
  } catch(e) {
    // window.localStorage.setItem('maze', '[]')
    // mazeWalls = []
    console.error('failed to create maze', e)
  }
}

function addCamera() {
  // debug cam
  // camera = new ArcRotateCamera('camera', Math.PI/2, Math.PI/2.5, 130, new Vector3(0,2,0), scene)
  // camera.attachControl(canvas, true)

  // build maze cam
  // camera = new ArcRotateCamera('camera', Math.PI/2, 0, 140, new Vector3(0,0,0), scene)
  // // camera.attachControl(canvas, true)
  // enableDrawMaze()
  
  // // follow cam
  const cameraDist = 13
  camera = new FollowCamera('camera', new Vector3(0, 2, 0), scene)
  camera.lockedTarget = character

  // camera.lowerAlphaLimit = 
  // camera.upperAlphaLimit
  // camera.lowerBetaLimit = 
  // camera.upperBetaLimit
  // camera.lowerRadiusLimit = 2
  // camera.upperRadiusLimit = cameraDist
  // camera.wheelDeltaPercentage = 0.01

  // camera.heightOffset = 3
  // camera.rotationOffset = 0
  camera.cameraAcceleration = .03 // how quickly to accelerate to the "goal" position
  camera.maxCameraSpeed = 10 // speed at which acceleration is halted
}

function addGround() {
  const arenaSize = 100
  ground = MeshBuilder.CreateGround('ground', {
    width: arenaSize, 
    height: arenaSize,
    subdivisions: 10,
  }, scene)
  // const grassTexture = new GrassProceduralTexture('grassTexture', arenaSize*arenaSize, scene) // seems super slow?
  const grassTexture = new Texture('/textures/grass.jpg', scene)
  // repeats the texture...but not sure on details
  grassTexture.uScale = 30
  grassTexture.vScale = 30
  const grassMaterial = new StandardMaterial('grassMaterial', scene)
  grassMaterial.ambientTexture = grassTexture 
  ground.material = grassMaterial
}

function addInputTracking() {
  scene.actionManager = new ActionManager(scene)
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, e => inputMap[e.sourceEvent.key] = true))
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, e => inputMap[e.sourceEvent.key] = false))
}

async function addCharacter() {
  const result = await SceneLoader.ImportMeshAsync('', '/scenes/pinkboy/', 'pinkboy.glb', scene)
  character = result.meshes[0]
  character.name = 'pinkboy'
  character.position.z = -45
  const idle = scene.getAnimationGroupByName('Idle')
  const run = scene.getAnimationGroupByName('Run')
  let animating = false
  scene.onBeforeRenderObservable.add(() => {
    animating = false
    if (inputMap['w']) {
      character.moveWithCollisions(character.forward.scaleInPlace(characterSpeed))
      run.start(true, 1, run.from, run.to, false)
      animating = true
    }
    if (inputMap['s']) {
      // character.moveWithCollisions(character.forward.scaleInPlace(-characterSpeed/2))
      character.rotate(Axis.Y, -characterRotationSpeed) // TODO: handle better...
      animating = true
    }
    if (inputMap['a']) {
      character.rotate(Axis.Y, -characterRotationSpeed)
      animating = true
    }
    if (inputMap['d']) {
      character.rotate(Axis.Y, characterRotationSpeed)
      animating = true
    }

    if (!animating) {
      run.stop()
      idle.start(true, 1, idle.from, idle.to, false)
    }
  })
}

function addFountain() {
  const fountainProfile = [
    [0, 0],
    [10, 0],
    [9, 1],
    [9.5, 1.5],
    [9.5, 2],
    [7, 2.5],
    [7, .5],
    [3, 2],
    [2.8, 6],
    [5, 8],
    [2.7, 7.4],
    [2.6, 12],
    [4, 15],
    [0, 14],
  ].map(p => new Vector3(p[0], p[1], 0))
  const fountain = MeshBuilder.CreateLathe('fountain', {
    shape: fountainProfile,
    sideOrientation: Mesh.DOUBLESIDE,
  }, scene)
  const scale = .2
  fountain.scaling = new Vector3(scale, scale, scale)
  fountain.position.z = -40
  fountain.checkCollisions = true

  const fountainWater = new ParticleSystem('fountainWater', 5000, scene)
  fountainWater.particleTexture = new Texture('textures/flare.png')
  fountainWater.emitter = fountain.position.add(new Vector3(0, 3, 0)) // top of fountain
  fountainWater.minEmitBox = new Vector3(-.02, 0, -.02) // minimum box dimensions
  fountainWater.maxEmitBox = new Vector3(.02, 0, .02) // maximum box dimensions
  fountainWater.color1 = new Color4(.7, .8, 1, 1)
  // can have 2 other colors and tell how to blend them with `blendMode`, but...why?
  fountainWater.minSize = .03
  fountainWater.maxSize = .08
  fountainWater.minLifeTime = .3
  fountainWater.maxLifeTime = 1.5
  fountainWater.emitRate = 3500
  fountainWater.direction1 = new Vector3(-1.4, 8, 1.4)
  fountainWater.direction2 = new Vector3(1.4, 8, -1.4)
  fountainWater.minEmitPower = 0.1
  fountainWater.maxEmitPower = 0.4
  fountainWater.updateSpeed = 0.02
  fountainWater.gravity = new Vector3(0, -9, 0)
  fountainWater.parent = fountain
  fountainWater.start()
  fountainWater.parent = fountain
}