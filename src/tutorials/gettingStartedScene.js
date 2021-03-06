// went through "Getting started" tutorials here: https://doc.babylonjs.com/start for high level of all major features

import { Action, ActionManager, Animation, ArcRotateCamera, Axis, Color3, Color4, CubeTexture, DirectionalLight, ExecuteCodeAction, FollowCamera, HemisphericLight, Mesh, MeshBuilder, ParticleSystem, PointerEventTypes, PointerInfo, Quaternion, Scene, SceneLoader, ShadowGenerator, Sound, Space, SpotLight, Sprite, SpriteManager, StandardMaterial, Texture, Tools, TransformNode, Vector3 } from '@babylonjs/core'

import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture'
import { Control } from '@babylonjs/gui/2D/controls/control'
import { GrassProceduralTexture } from '@babylonjs/procedural-textures/grass/grassProceduralTexture'
import { Slider } from '@babylonjs/gui/2D/controls/sliders/slider'
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel'
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock'
import earcut from 'earcut'

let scene
let worldSize = 150

export default async function create(engine, canvas) {
  scene = new Scene(engine)
  // scene.fogMode = Scene.FOGMODE_EXP // auto fog...
  const camera = new ArcRotateCamera('camera', 4.840, 1.296, 19, new Vector3(), scene)
  camera.attachControl(canvas, true)
  camera.upperBetaLimit = Math.PI / 2.2 // don't allow camera to display anything below ground level. can still pan down below tho...

  // const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene) // ambient light that does not cast shadows
  const light = new DirectionalLight('light', new Vector3(0, -1, 1), scene) // light that's more like sun and casts shadows

  light.position = new Vector3(0, 50, -100) // setting position will affect the direction and length of any created shadows
  const shadowGenerator = new ShadowGenerator(1024, light) // 3 parts to shadows: light source, shadow caster, shadow receiver
  light.intensity = 1

  addSky()
  addGround()
  addTrees()
  addHouses()
  addFountain()
  addCar()
  await addCharacter(shadowGenerator, canvas)
  await addOldWaterTower()
  addControls(light)
  // // addUfo()
  // // playBackgroundSounds()

  // // to make VR compatible, pretty much just do this...yay
  // scene.createDefaultVRExperience()
  
  return scene
}

function addControls(light) {
  // nice thing about babylong.gui is that it's controls are part of the canvas and can be seen in VR, unlike HTML dom elements...
  // think game menus, for instance...pause screen, new game, resume game, etc
  // related: the inspector GUI is probably visible and interactive too, which will be handy for VR game dev
  // our world's GUI will use the full screen
  // TODO: check out svelte webgl stuff...
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('ui')
  const panel = new StackPanel()
  panel.width = '220px'
  panel.top = '-50px'
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
  ui.addControl(panel)
  const header = new TextBlock()
  header.text = 'Sunlight'
  header.height = '30px'
  header.color = 'white'
  panel.addControl(header)
  const slider = new Slider()
  slider.minimum = 0
  slider.maximum = 1
  slider.borderColor = 'black'
  slider.color = '#aaa'
  slider.background = '#fff'
  slider.value = 1
  slider.height = '20px'
  slider.width = '200px'
  panel.addControl(slider)
  slider.onValueChangedObservable.add(value => light.intensity = value) // presumably it'd be ideal to also turn off the house lamps when it gets bright enough? For performance reasons?
}

async function addOldWaterTower() {
  const towerRoot = await SceneLoader.ImportMeshAsync('old_water_tower', '/scenes/', 'old_water_tower_blender.glb', scene)
  towerRoot.meshes[0].name = 'waterTower'
  const tower = towerRoot.meshes[1]
  tower.position = new Vector3(-5, 10, 14)
  tower.rotation = new Vector3(0, Tools.ToRadians(200), 0)
  const scale = .06
  tower.scaling = new Vector3(scale, scale, scale)
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
  const scale = .1
  fountain.scaling = new Vector3(scale, scale, scale)
  fountain.receiveShadows = true

  const fountainWater = new ParticleSystem('fountainWater', 5000, scene)
  fountainWater.particleTexture = new Texture('textures/flare.png')
  fountainWater.emitter = new Vector3(0, 1.5, 0) // top of fountain
  fountainWater.minEmitBox = new Vector3(-.01, 0, -.01) // minimum box dimensions
  fountainWater.maxEmitBox = new Vector3(.01, 0, .01) // maximum box dimensions
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
  fountainWater.updateSpeed = 0.01
  fountainWater.gravity = new Vector3(0, -9, 0)

  // toggle fountain water when fountain clicked
  fountainWater.start()
  let on = true

  // handle the click with "Observables"...
  // scene.onPointerObservable.add(e => {
  //   const clickedFountain = e.type === PointerEventTypes.POINTERDOWN && e.pickInfo.hit && e.pickInfo.pickedMesh === fountain
  //   if (clickedFountain) {
  //     on = !on
  //     if (on) fountainWater.start()
  //     else fountainWater.stop()
  //   }
  // })

  // alternatively, using "Actions"--actions use observables under the hood, sounds like
  // actions look nice for animating in order or simultaneously...
  fountain.actionManager = new ActionManager(scene)
  fountain.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickDownTrigger, e => {
    console.log(e)
    on = !on
    if (on) fountainWater.start()
    else fountainWater.stop()
  }))
}

function addUfo() {
  const ufoSpriteManager = new SpriteManager('ufoSpriteManager', '/textures/ufo-sprite-animated.png', 1, {width:128, height:76}, scene)
  const ufo = new Sprite('ufo', ufoSpriteManager)
  ufo.position.y = 5
  ufo.playAnimation(0, 16, true, 125)
}

function addTrees() {
  const totalTrees = 1000
  const treeSpriteManager = new SpriteManager('treeSpriteManager', '/textures/tree-sprite.png', totalTrees, {width:394, height:537}, scene)
  const trees = []
  for (let i = 0; i < totalTrees/2; i++) {
    const tree = new Sprite('tree', treeSpriteManager)
    const y = .4
    tree.position = new Vector3(
      Math.random() * -30, 
      y,
      Math.random() * 20 + 8, 
    )

    const tree2 = new Sprite('tree', treeSpriteManager)
    tree2.position = new Vector3(
      Math.random() * 25 + 7, 
      y,
      Math.random() * -35 + 8, 
    )

    trees.push(tree)
    trees.push(tree2)
  }

  // grow
  const treesGrowing = scene.onBeforeRenderObservable.add(() => {
    const deltaTime = scene.getEngine().getDeltaTime() / 1000.0 // time in between frames. divide by 1000 to get seconds (from milliseconds)
    const growAmount = deltaTime/2
    for (const tree of trees) {
      tree.height += growAmount
      tree.width += growAmount
    }
    if (trees[0].height > 5) scene.onBeforeRenderObservable.remove(treesGrowing) // done growing, so no need to call this anymore
  })
}

function addSky() {
  // pretty crappy since image wasn't in blender 3x2 format, but whatever for now...
  const skybox = MeshBuilder.CreateBox('skybox', {size: worldSize}, scene)
  skybox.position.y = 45
  const skyboxMaterial = new StandardMaterial('skyboxMaterial', scene)
  skyboxMaterial.backFaceCulling = false // no need to render the outside of the box which will never be seen
  skyboxMaterial.reflectionTexture = new CubeTexture('/textures/skybox/CasualDay', scene)
  skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE
  skyboxMaterial.diffuseColor = new Color3(0,0,0)
  skyboxMaterial.specularColor = new Color3(0,0,0)
  skybox.material = skyboxMaterial
}

async function addCharacter(shadowGenerator, canvas) {
  const characterResult = await SceneLoader.ImportMeshAsync('him', '/scenes/dude/', 'dude.babylon', scene)
  const character = characterResult.meshes[0]
  character.name = 'dude'
  const scale = .0625*.5 // quarter of a quarter
  character.scaling = new Vector3(scale,scale,scale)
  shadowGenerator.addShadowCaster(character, true)
  scene.beginAnimation(characterResult.skeletons[0], 0, 100, true, 1.0)

  // walk around
  character.position = new Vector3(2,0,2)
  // const triangle = MeshBuilder.CreateLines('triangle', { 
  //   points: [
  //     [2,2],
  //     [2,-2],
  //     [-2,-2],
  //     [2,2],
  //   ].map(p => new Vector3(p[0], 0, p[1]))
  // }, scene)
  const track = [
    [Tools.ToRadians(90), 3.6],
    [Tools.ToRadians(96), 3.6],
    [Tools.ToRadians(85), 3.6],
    [Tools.ToRadians(70), 3.6],
  ].map(t => ({ turn: t[0], dist: t[1] }))
  let trackId = 0
  let distance = 0
  const speed = .017
  scene.onBeforeRenderObservable.add(() => {
    character.movePOV(0, 0, speed)
    distance += speed
    if (distance > track[trackId].dist) {
      distance = 0
      character.rotate(Axis.Y, track[trackId].turn, Space.LOCAL) // relative turn (additive rotation, as opposed to absolute WORLD rotation)
      trackId = trackId === track.length-1 ? 0 : trackId + 1 // next track
      if (trackId === 0) {
        // if back at start reset everything to avoid gradual float errors...
        character.position = new Vector3(2,0,2)
        character.rotation = Vector3.Zero()
      }
    }
  })
    
  // // let's add a camera that follows the character
  // // but the camera rotation changes immediately when the character's rotation does, which is unnatural...
  // const camera = new ArcRotateCamera('camera', 1.6, 1, 233, new Vector3(), scene)
  // camera.attachControl(canvas, true)
  // camera.parent = character

  // // so let's use a follow camera
  // // we give it a start postion and a "goal" position to view the target from (gradually makes it's way to that position as needed)
  // const camera = new FollowCamera('camera', new Vector3(-6, 0, 0), scene)
  // camera.heightOffset = 3
  // camera.radius = 6
  // camera.rotationOffset = 0
  // camera.cameraAcceleration = .01 // how quickly to accelerate to the "goal" position
  // camera.maxCameraSpeed = 10 // speed at which acceleration is halted
  // // camera.attachControl(canvas, true) // so user can still control it a bit too. But ideally lock the min/maxes for rotation and lock distance entirely
  // // hmm, seems to be looking at the center of his body, instead of his head. And if I lock it to his head, doesn't rotate since head technically doesn't rotate...
  // // height offset doesn't change direction it looks in, which makes sense
  // // rotation offset is around the y axis, seems
  // // so for now, just pulled it back more
  // camera.lockedTarget = character
}

function addCar() {
  const outline = [
    [-.3, -.1],
    [ .2, -.1],
    [ .45, .25],
    [-.3, .1],
  ].map(point => new Vector3(point[0], 0, point[1]))
  //top
  outline.push(new Vector3(0, 0, .1));
  outline.push(new Vector3(-.3, 0, .1));
  const carBody = MeshBuilder.ExtrudePolygon('carBody', {shape: outline, depth: .2}, scene, earcut)
  carBody.rotation.x = Tools.ToRadians(-90)
  carBody.position.y = .16
  carBody.position.z = -2
  const wheelRB = MeshBuilder.CreateCylinder('wheelRB', {diameter: .125, height: .05})
  const wheelMaterial = new StandardMaterial('wheelMaterial')
  wheelMaterial.diffuseTexture = new Texture('/textures/wheel.png', scene)
  wheelRB.material = wheelMaterial
  wheelRB.rotation.y = 0
  wheelRB.position.z = -.1
  wheelRB.position.x = -.2
  wheelRB.position.y = .035
  wheelRB.parent = carBody // so wheels position follow along with car
  // guessing this is how _most_ animations should be done in babylon.
  // the render loop should really just be swapping out animations that are currently running, given user input, and computing basic game state
  // in general build things outside babylon, add their animations outside too, then import into babylong and add game logic that uses the imported meshes and their animations
  const wheelAnimation = new Animation('wheelAnimation', 'rotation.y', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE)
  wheelAnimation.setKeys([
    { frame: 0, value: 0 },
    { frame: 30, value: Tools.ToRadians(-360) } // after 1 sec, wheel should rotate 360 (30fps frames per sec)
  ])
  wheelRB.animations = [wheelAnimation]
  
  const wheelRF = wheelRB.clone('wheelRF') // clone? Would createInstance work? 
  wheelRF.position.x = .1
  const wheelLB = wheelRB.clone('wheelLB')
  wheelLB.position.y = -.2 - .035
  const wheelLF = wheelRF.clone('wheelLF')
  wheelLF.position.y = -.2 - .035
  scene.beginAnimation(wheelRB, 0, 30, true)
  scene.beginAnimation(wheelRF, 0, 30, true)
  scene.beginAnimation(wheelLB, 0, 30, true)
  scene.beginAnimation(wheelLF, 0, 30, true)

  // car animation
  const carAnimation = new Animation('carAnimation', 'position.x', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE)
  carAnimation.setKeys([
    { frame: 0, value: 3 },
    { frame: 150, value: 0 },
    { frame: 210, value: 0 },
  ])
  carBody.animations = [carAnimation]
  scene.beginAnimation(carBody, 0, 210, true)

  const car = new TransformNode('car', scene)
  carBody.parent = car
  car.scaling = new Vector3(2, 2, 2)
}

function addGround() {
  // const ground = MeshBuilder.CreateGround('ground', { width: arenaSize, height: arenaSize }, scene)
  const ground = MeshBuilder.CreateGroundFromHeightMap('ground', '/textures/ground-height-map.png', {
    width: worldSize,
    height: worldSize,
    subdivisions: 10, // splits it into 20x20 grid. so 400 sections for good nuff resolution
    minHeight: 0,
    maxHeight: 10,
  })
  const groundMaterial = new StandardMaterial('groundMaterial', scene)
  // const grassTexture = new GrassProceduralTexture('grassTexture', arenaSize*arenaSize, scene)
  const groundTexture = new Texture('/textures/snow-medium.jpg', scene)
  groundMaterial.diffuseTexture = groundTexture
  // groundMaterial.ambientTexture = groundTexture // ambient handles shadows
  ground.material = groundMaterial
  ground.position.y = -.1
  
  // higher res for playable area
  const villageSize = 40
  const villageGround = MeshBuilder.CreateGround('villageGround', {width: 24, height:24})
  villageGround.material = groundMaterial
  villageGround.receiveShadows = true
}

function addHouses() {
  const height = 1.5
  const base = MeshBuilder.CreateBox('base', { width: 2, height, depth: 3 }, scene)
  base.position.y = height/2
  const baseMaterial = new StandardMaterial('baseMaterial')
  baseMaterial.diffuseTexture = new Texture('/textures/logwall.jpg', scene)
  base.material = baseMaterial

  const roof = MeshBuilder.CreateCylinder('roof', {diameter: 1.3, height: 1.2, tessellation: 3 })
  roof.rotation.z = Tools.ToRadians(90) // created vertically, so turn it
  roof.rotation.y = Tools.ToRadians(90)
  roof.position.y = height
  roof.scaling.x = .5 // flatten roof a bit
  roof.scaling.y = 2.8 // slightly overhanging
  roof.scaling.z = 2.8
  const roofMaterial = new StandardMaterial('roofMaterial')
  roofMaterial.diffuseTexture = new Texture('/textures/rooftiles.png', scene)
  roof.material = roofMaterial

  const houseOriginal = Mesh.MergeMeshes([base, roof], true, false, null, false, true)
  houseOriginal.name = 'house'
  houseOriginal.position.x = -5
  houseOriginal.rotation.y = -20
  houseOriginal.receiveShadows = true
  addHouseLamp(houseOriginal)

  const lots = [
    [5,0, 23],
    [0,5, -14]
  ]
  for (let i = 0; i < lots.length; i++) {
    const lot = lots[i];
    const house = houseOriginal.createInstance('house')
    house.position = new Vector3(lot[0], 0, lot[1])
    house.rotation.y = Tools.ToRadians(lot[2])
    addHouseLamp(house)
  }
}

function addHouseLamp(houseOriginal) {
  // note scenes generally restrict 4 lights to a scene
  // to modify, can set `material.maxSimultaneousLights = 5`
  const lampLight = new SpotLight(
    'lampLight',
    new Vector3(0, 1.5, -1.6),
    new Vector3(0, -1, 0),
    Math.PI,
    2,
    scene
  )
  lampLight.parent = houseOriginal
}

function playBackgroundSounds() {
  // note the dev inspector mutes sounds by default
  const noise = new Sound('noise', '/sounds/little-fella-noise.wav', scene, () => noise.play())
}