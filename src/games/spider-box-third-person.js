/*TODO:
- LATER
  - character should stand back up if it falls over. wait til it's not moving very much anymore (has settled on floor after a fall...)
  - should only be able to jump if on solid ground and upright (not when falling or on side...)
  - jump should play animation if not already playing and stop when done--rather than instantly being at max jump height upon starting to jump lol
- make buildings (basic boxes that are huge)
- make character box that's taller than wide/deep
- make character jump
- use mouse click and pointer to attach webs for the character to swing on
  - once new web is attached, any old ones should be detached/destroyed
    - actually, leave your last 10-20 ropes around so they're just hanging off the buildings limp and moving slightly lol
  - make character swing on webs using physics engine
  - should make it as realistic in terms of physics as possible--so if you shoot a web to a point directly below you, you should free fall and fall to the end of the rope and bounce around a bunch and loose your momentum
  - should be able to walk slowly up buildings (if fall to ground)

- once you have proof of concept in place, bring it to VR!
  - instead of mouse/click, use VR controller to point and trigger to shoot a web!
  - prepare to vomit!

- add objective so you can win the game
  - get to the top of some building within a time limit or swing through loops in the sky or something...nothing crazy, just give ability to win
*/

import { Action, ActionManager, AmmoJSPlugin, ArcRotateCamera, Axis, Color3, ExecuteCodeAction, FollowCamera, HemisphericLight, MeshBuilder, PhysicsImpostor, PointerEventTypes, Quaternion, Scene, StandardMaterial, TransformNode, UniversalCamera, Vector3 } from '@babylonjs/core'

import Ammo from 'ammo.js'

let scene
let inputMap = {}
let character
let canvas
let buildings = []
let webs = []
const gravity = new Vector3(0,-9.81,0)
const buildingHeight = 50

export default async function create(_engine, _canvas) {
  scene = new Scene(_engine)
  canvas = _canvas
  addLight()
  addInputTracking()
  await addPhysics()
  addCity()
  addCharacter()
  // addCamera()
  return scene
}


function addLight() {
  new HemisphericLight('light', new Vector3(0, 1, 0), scene)
}

function addInputTracking() {
  scene.actionManager = new ActionManager(scene)
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, e => inputMap[e.sourceEvent.key] = true))
  scene.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, e => inputMap[e.sourceEvent.key] = false))
}

async function addPhysics() {
  const ammo = await Ammo()
  // scene.gravity = gravity
  // scene.collisionsEnabled = true
  scene.enablePhysics(gravity, new AmmoJSPlugin(true, ammo))
}

function addCharacter() {
  // character = new TransformNode('character', scene)
  character = MeshBuilder.CreateBox('character', { height: 2 }, scene)
  character.physicsImpostor = new PhysicsImpostor(character, PhysicsImpostor.BoxImpostor, {
    mass: .1,
    restitution: .9,
    friction: 1,
  })
  // character.checkCollisions = true
  character.rotationQuaternion = Quaternion.RotationAxis(Axis.Y, 90)
  character.material = new StandardMaterial('characterMat', scene)
  character.material.diffuseColor = new Color3.Red()
  setCharacterOnBuilding(0)

  scene.onPointerObservable.add(e => {
    // shoot webs
    if (e.event.button === 0 && e.pickInfo.hit && e.pickInfo.pickedPoint) createWebFromCharacterToPointOnMesh(e.pickInfo.pickedPoint)
  }, PointerEventTypes.POINTERDOWN)

  const camera = new FollowCamera('camera', new Vector3(0, 2, 0), scene)
  camera.rotationOffset = 180
  camera.noRotationConstraint = true  
  camera.lockedTarget = character
  camera.cameraAcceleration = .03 // how quickly to accelerate to the "goal" position
  camera.maxCameraSpeed = 10 // speed at which acceleration is halted
  // camera.attachControl(canvas, true)

  // const camera = new UniversalCamera('camera', new Vector3(0, 2, 0), scene)
  // camera.position = new Vector3(character.position.x, character.position.y, character.position.z - 20)
  // // camera.target = character
  // camera.attachControl(canvas, true)
  // camera.setTarget(character.position)
  // // camera.fov = 0.47350045992678597
  // // character.parent = camera

  // const camera = new ArcRotateCamera('camera', 0, 0, 10, character.position, scene)
  // camera.attachControl(canvas, true)
  // camera.lockedTarget = character

  const characterSpeed = .2
  const characterRotationSpeed = .02
  const characterJumpHeight = .3
  scene.onBeforeRenderObservable.add(() => {
    if (inputMap['w']) {
      character.moveWithCollisions(character.forward.scaleInPlace(characterSpeed))
      // camedwra.position.addInPlace(camera.getDirection(Vector3.Forward()));
      // character.physicsImpostor.applyImpulse(camera.getDirection(Vector3.Forward()).scale(characterSpeed*.01), Vector3.Zero())
    }
    if (inputMap['s']) {
      character.rotate(Axis.Y, -characterRotationSpeed) // todo: turn around animation instead
    }
    if (inputMap['a']) {
      character.rotate(Axis.Y, -characterRotationSpeed)
    }
    if (inputMap['d']) {
      character.rotate(Axis.Y, characterRotationSpeed)
    }
    if (inputMap[' ']) {
      character.position.y += characterJumpHeight
      clearAllWebs()
    }
    // set camera by character
    // camera.position = new Vector3(character.position.x, character.position.y + 1, character.position.z - 3)
    // camera.target = character.position

    // console.log(character.rotation)
    if (inputMap['r']) {
      setCharacterOnBuilding(0)
      clearAllWebs()
    }
  })
}

function createWebFromCharacterToPointOnMesh(pickedPoint) {
  // TODO: may need to create a physics imposter at the picked point to attach a web too...
  // const webPoint = 

  // console.log(pickedPoint, character.position)
  clearAllWebs() // later on, just detach character from all webs (or just previous web)
  const numPoints = 6
  const webPoints = []
  for (let i = 0; i<numPoints; i++) {
    webPoints.push(character.position.clone(), pickedPoint.clone())
  }
  const web = MeshBuilder.CreateLines('line', {
    points: webPoints,
  }, scene)
  web.color = new Color3.White()
  web.physicsImpostor = new PhysicsImpostor(web, PhysicsImpostor.RopeImpostor, {
    fixedPoints: 2,
    // mass: .1,
    // restitution: .1,
    // friction: 0.8,
    // stiffness: .5,
    positionIterations: 2,
    velocityIterations: 8,
  })
  web.physicsImpostor.addHook(character.physicsImpostor, 1, .5, true)
  webs.push(web)
}

function addCity() {
  const city = new TransformNode('city', scene)
  addGround(city)
  addBuildings(city)
}

function addGround() {
  const ground = MeshBuilder.CreateBox('ground', {
    width: 500, 
    depth: 100,
    height: 1,
    subdivisions: 10,
  }, scene)
  ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.BoxImpostor, {
    mass: 0,
    restitution: .2,
    friction: 1,
  })
  ground.material = new StandardMaterial('groundMat', scene)
  ground.material.diffuseColor = new Color3.FromHexString('#707370')
}

function addBuildings(city) {
  const numBuildings = 20
  for (let i = 0; i < numBuildings; i++) {
    const building = MeshBuilder.CreateBox('building', {
      width: 10,
      depth: 10,
      height: buildingHeight,
    }, scene)
    building.position.y = buildingHeight/2
    building.position.x = (i - (numBuildings / 2)) * 20
    building.position.z = i % 2 === 0 ? -10 : 10
    building.physicsImpostor = new PhysicsImpostor(building, PhysicsImpostor.BoxImpostor, {
      mass: 0,
      restitution: .2,
      friction: .9,
    })
    // building.checkCollisions = true
    building.material = new StandardMaterial(`buildingMat_${i}`, scene)
    building.material.diffuseColor = new Color3.FromHexString("#8CC6DB")
    building.parent = city
    buildings.push(building)

    // platforms for now...
    const platform = MeshBuilder.CreateBox('platform', {
      width: 10,
      depth: 10,
      height: 5,
    }, scene)
    platform.position.y = buildingHeight + 10
    platform.position.x = (i - (numBuildings / 2)) * 20
    platform.position.z = 0
    platform.physicsImpostor = new PhysicsImpostor(platform, PhysicsImpostor.BoxImpostor, {
      mass: 0,
      restitution: .2,
      friction: 1,
    })
    platform.material = new StandardMaterial('platformMat', scene)
    platform.material.diffuseColor = new Color3.FromHexString('#8CC6DB')
    platform.parent = city
  }
}

function setCharacterOnBuilding(i) {
  const building = buildings[i]
  character.position.x = building.position.x
  character.position.z = building.position.z
  character.position.y = buildingHeight + 1.5
  character.rotationQuaternion = building?.rotationQuaternion?.clone()
  character.physicsImpostor?.setLinearVelocity(Vector3.Zero())
  character.physicsImpostor?.setAngularVelocity(Vector3.Zero())
}

function clearAllWebs() {
  webs.forEach(web => {
    web.physicsImpostor.dispose()
    web.dispose()
  })
  webs = []
}