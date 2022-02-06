/*TODO:
- NOW
  - make camera intuitive
    - camera rotation controlled by mouse
    - camera movement controlled by W
    - camera has physics imposter so it falls off building
      - hang on...I think I want the first one to be 3rd person actually...
        - yes...the camera should face the direction the character is _moving_, not facing
  - destroy web on pointer up (like you're grabbing the web and then let go...)
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
  - only have hands, no arms probably (like Onward)
    - ideally animate the spiderman hands to send the web, etc
  - keep the grip button pressed to hold onto the web. once released, drop the web

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
let isLocked = false
const gravity = new Vector3(0,-9.81,0)

export default async function create(_engine, _canvas) {
  scene = new Scene(_engine)
  canvas = _canvas
  addLight()
  addInputTracking()
  await addPhysics()
  addCity()
  addCharacter()
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
  character = new TransformNode('character', scene)
  character.position.y = 20
  const characterMesh = MeshBuilder.CreateBox('characterMesh', { height: 2 }, scene)
  characterMesh.physicsImpostor = new PhysicsImpostor(characterMesh, PhysicsImpostor.BoxImpostor, {
    mass: .1,
    restitution: .9,
    friction: 0.1,
  })
  // character.checkCollisions = true
  characterMesh.rotationQuaternion = Quaternion.RotationAxis(Axis.Y, 90)
  characterMesh.material = new StandardMaterial('characterMat', scene)
  characterMesh.material.diffuseColor = new Color3.Red()
  characterMesh.parent = character
  setCharacterOnBuilding(0)

  // setup custom follow camera that doesn't rotate upside down with character and allows player to look around without moving character
  const camera = new UniversalCamera("UniversalCamera", new Vector3(0, 2, -25), scene)
  camera.applyGravity = true
  camera.ellipsoid = new Vector3(1,1.5,1)
  // camera.checkCollisions = true
  camera.attachControl(canvas, true)
  //Set gravity for the scene (G force like, on Y-axis)
  scene.gravity = new Vector3(0, -0.9, 0)

  // Enable Collisions
  scene.collisionsEnabled = true

  //Then apply collisions and gravity to the active camera
  camera.checkCollisions = true
  camera.applyGravity = true
  
  character.parent = camera

  scene.onPointerObservable.add(e => {
    // lock pointer to scene, so mouse controls camera
    if (!isLocked) {
      canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock
      if (canvas.requestPointerLock) {
        canvas.requestPointerLock()
      }
    }

    // shoot webs
    if (e.event.button === 0 && e.pickInfo.hit && e.pickInfo.pickedPoint) createWebFromCharacterToPointOnMesh(e.pickInfo.pickedPoint)
  }, PointerEventTypes.POINTERDOWN)

  // //Controls  WASD
  // camera.keysUp.push(87); 
  // camera.keysDown.push(83);            
  // camera.keysRight.push(68);
  // camera.keysLeft.push(65);

  // const camera = new ArcRotateCamera('camera', -1.925, 1.241, 29, new Vector3(), scene)
  // camera.attachControl(canvas, true)
  // camera.target = character.position
  // camera.position = new Vector3(character.position.x, character.position.y + 1, character.position.z - 3)

  // const camera = new FollowCamera('camera', new Vector3(0, 2, 0), scene)
  // camera.rotationOffset = 180
  // // camera.noRotationConstraint = true
  // camera.upperRadiusLimit = 10
  // camera.lockedTarget = character
  // camera.cameraAcceleration = .03 // how quickly to accelerate to the "goal" position
  // camera.maxCameraSpeed = 10 // speed at which acceleration is halted

  const characterSpeed = .2
  const characterRotationSpeed = .02
  const characterJumpHeight = .1
  scene.onBeforeRenderObservable.add(() => {
    if (inputMap['w']) {
      // character.moveWithCollisions(character.forward.scaleInPlace(characterSpeed))
      // camera.moveWithCollisions(camera.cameraDirection.scaleInPlace(characterSpeed))
      camera.position.addInPlace(camera.getDirection(Vector3.Forward()));
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
  addFloatingPlatform(city)
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
    friction: .9,
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
      height: 20,
    }, scene)
    building.position.y = 10
    building.position.x = (i - (numBuildings / 2)) * 20
    building.position.z = i % 2 === 0 ? -10 : 10
    // building.physicsImpostor = new PhysicsImpostor(building, PhysicsImpostor.BoxImpostor, {
    //   mass: 0,
    //   restitution: .2,
    //   friction: .9,
    // })
    building.checkCollisions = true
    building.material = new StandardMaterial(`buildingMat_${i}`, scene)
    building.material.diffuseColor = new Color3.FromHexString("#8CC6DB")
    building.parent = city
    buildings.push(building)
  }
}

function setCharacterOnBuilding(i) {
  const building = buildings[i]
  character.position.x = building.position.x
  character.position.z = building.position.z
  character.position.y = building.position.y + 12
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

function addFloatingPlatform(city) {
  const platform = MeshBuilder.CreateBox('platform', {
    width: 10,
    depth: 10,
    height: 10,
  }, scene)
  platform.position.y = 30
  platform.position.x = -170
  platform.position.z = 0
  platform.physicsImpostor = new PhysicsImpostor(platform, PhysicsImpostor.BoxImpostor, {
    mass: 0,
    restitution: .2,
    friction: .9,
  })
  platform.material = new StandardMaterial('platformMat', scene)
  platform.material.diffuseColor = new Color3.FromHexString('#8CC6DB')
  platform.parent = city
}