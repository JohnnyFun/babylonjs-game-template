/**
  TODO: show LOSE screen with retry button ("Click any button to retry". or put a mesh for them to smack with their gun!)
  TODO: upon going into VR, set the webxr camera position...currently, you can tilt the camera and then get placed right next to the targets lol
  TODO: make cooler gun mesh?
  TODO: rotate bullet accordingly...hmm, if turn, the bullet doesn't rotate with the gun barrel...
  TODO: 1 bullet at time--probably need to handle pressed like tutorial does it...
  TODO: make HUD bigger
  TODO: HUD is duplicated?
 */

import { Animation, ArcRotateCamera, Color3, CubeTexture, HemisphericLight, Mesh, MeshBuilder, Ray, Scene, StandardMaterial, Texture, Tools, TransformNode, Vector3 } from '@babylonjs/core'

import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture'
import { Control } from '@babylonjs/gui/2D/controls/control'
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel'
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock'

let worldSize = 150
let scene
let currentTargets = []
let targetsLeftText
let timeLeftText
let bulletsLeftText
let bulletCount = 30
let timeLeft = 30*1000 // in seconds
let lost = false
let targetAnimatable = null
let ground = null
let gun

export default async function create(engine, canvas) {
  scene = new Scene(engine)
  const camera = new ArcRotateCamera('camera', 0, 1, 29, new Vector3(), scene)
  // camera.attachControl(canvas, true)
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene)
  addSky()
  addGround()
  addTargets()
  addControls()
  addGun()
  await addXRViewAndInput()
  return scene
}


function addGround() {
  ground = MeshBuilder.CreateGroundFromHeightMap('ground', '/textures/ground-height-map.png', {
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

async function addXRViewAndInput() {
  const xr = await scene.createDefaultXRExperienceAsync({
    disableTeleportation:true,
    floorMeshes: [ground]
  })
  xr.input.onControllerAddedObservable.add(inputSource => {
    console.log('inputsource', inputSource)
    inputSource.onMotionControllerInitObservable.add(motionController => {
      if (motionController.handedness === 'right') {
        console.log('motioncontroller', motionController)
        const triggerComponent = motionController.getComponent('xr-standard-trigger') // or getComponentOfType('squeeze') (see physics vr demo for example of how to find right hand trigger and handle it)
        if (triggerComponent) {
          console.log('triggerComponent', triggerComponent)
          triggerComponent.onButtonStateChangedObservable.add((controller, event) => {
            if (controller.changes.pressed && controller.pressed ) {
              console.log('trigger action', controller, event)
              fire(gun, inputSource)
            }
          })
        }

        motionController.onModelLoadedObservable.add(model => {
          console.log('model', model)
          gun.parent = model.rootMesh // box should follow gun. could also probably set the mesh of the controller to be the cube?
          gun.isVisible = true
          // model.rootMesh.visibility = .1 // can also replace entirely, but might want to use a hand or something later on...
          model.rootMesh.isVisible = false
          startPlaying()
        })
      }
    })
  })
}

function startPlaying() {
  scene.onBeforeRenderObservable.add(() => {
    const deltaTime = scene.getEngine().getDeltaTime() // time in between frames in milliseconds
    timeLeft -= deltaTime
    setStatus()
  })
}

function addGun() {
  // gun = MeshBuilder.CreateCylinder('gun', {
  //   height: 2,
  //   diameterTop: .1,
  //   diameterBottom: .3,
  // }, scene)
  gun = buildWeiner()
  const tempscale = .25
  gun.isVisible = false
  gun.scaling = new Vector3(tempscale, tempscale, tempscale)
  gun.setPivotPoint(new Vector3(0, -1, 0)) // pivot gun from base
  gun.rotation.x = Tools.ToRadians(-133)
  gun.position.y = 1
  return gun
}

function addControls() {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('ui')
  const panel = new StackPanel()
  panel.width = '220px'
  panel.top = '-200px'
  panel.left = '-200px'
  panel.background = 'black'
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  ui.addControl(panel)

  targetsLeftText = new TextBlock()
  targetsLeftText.text = getScoreText()
  targetsLeftText.height = '30px'
  targetsLeftText.color = 'white'
  panel.addControl(targetsLeftText)

  timeLeftText = new TextBlock()
  timeLeftText.text = getTimeLeftText()
  timeLeftText.height = '30px'
  timeLeftText.color = 'white'
  panel.addControl(timeLeftText)

  bulletsLeftText = new TextBlock()
  bulletsLeftText.text = getBulletsLeftText()
  bulletsLeftText.height = '30px'
  bulletsLeftText.color = 'white'
  panel.addControl(bulletsLeftText)
}

function getScoreText() {
  return `Targets left: ${currentTargets.length}`
}

function getTimeLeftText() {
  return `Time left: ${(timeLeft/1000).toFixed(2)}`
}

function getBulletsLeftText() {
  return `Bullets left: ${bulletCount}`
}

function addTargets() {
  const totalTargets = 10
  const targetHolder = new TransformNode('targets', scene)
  const targetMaterial = new StandardMaterial('targetMaterial', scene)
  targetMaterial.diffuseTexture = new Texture('/textures/target.jpg', scene)
  for (let i = 0; i < totalTargets; i++) {
    const target = i === 0 
    ? MeshBuilder.CreateBox('target', { height: 1, width: .5, depth: 1 }, scene) 
    : currentTargets[0].createInstance('target') // once we created one, just make a copy of it for others. no need for .clone since won't be changing textures...
    if (i === 0) target.material = targetMaterial
    target.position.x = 0
    target.position.z = (i+3-(totalTargets/2))*3
    target.position.y = 1
    target.parent = targetHolder
    currentTargets.push(target)
  }

  const frameRate = 10
  const targetAnimation = new Animation('targetAnimation', 'position.z', frameRate, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE)
  targetAnimation.setKeys([
    {frame:0,value:-5},
    {frame:frameRate/2,value:5},
    {frame:frameRate,value:-5},
  ])
  targetHolder.animations.push(targetAnimation)
  targetAnimatable = scene.beginAnimation(targetHolder, 0, getLastFrame(targetAnimation), true, .05)
}

function fire(gun, inputSource) {
  if (lost) return
  bulletCount--
  const bullet = new TransformNode('bulletTransform', scene)
  const bulletMesh = MeshBuilder.CreateCylinder('bullet', {height:.5, diameterTop: .005, diameterBottom: .05})
  const scale = .5
  bullet.scaling = new Vector3(scale, scale, scale)
  // bullet.rotation.x = Tools.ToRadians(-133)
  bullet.rotation.z = Math.PI/2
  bulletMesh.parent = bullet
  const pointerRay = new Ray(new Vector3(), new Vector3(), 0)
  console.log('inputSource', inputSource)
  console.log('pointerRay', pointerRay)
  inputSource.getWorldPointerRayToRef(pointerRay)
  bullet.position = inputSource.pointer.position.clone()
  // bullet.rotation = inputSource.pointer.rotation.clone()
  // bullet.rotation.y = Tools.ToRadians(-133) // probably cleaner way to do this and the gun?

  const checkForHits = scene.onBeforeRenderObservable.add(() => {
    const targetsHit = currentTargets.filter(t => t.intersectsMesh(bulletMesh))
    if (targetsHit.length > 0) {
      checkForHits.unregisterOnNextCall = true
      // ideally run an "explode" animation, but good nuff for now...
      // just setting not visible since .dispose() wonks with clones of the original target...
      targetsHit.forEach(t => t.isVisible = false)
      bullet.dispose()
      currentTargets = currentTargets.filter(t => !targetsHit.includes(t))
    }
  })

  const animatable = new Animation.CreateAndStartAnimation(
    'bullet', 
    bullet, 
    'position', 
    10,
    200,
    bullet.position.clone(), 
    bullet.position.add(pointerRay.direction.scale(600)),
    Animation.ANIMATIONLOOPMODE_CONSTANT,
    null,
    () => {
      checkForHits.unregisterOnNextCall = true
      bullet.dispose()
    }
  )

  // collision engine (checkCollisions = true/moveWithCollisions/etc...faster than physics engine and physics imposters?) vs mesh intersections vs physics engine auto?
  // bulletMesh.onCollideObservable.add((eventData, eventState) => {
  //   console.log('collision', eventData, eventState, eventData)
  // })
}

function setStatus() {
  if (currentTargets.length === 0) {
    targetsLeftText.text = 'YOU WON!!!!!!!'
  } else {
    targetsLeftText.text = getScoreText()

    lost = timeLeft <= 0 || bulletCount <= 0

    if (timeLeft <= 0) {
      // LOST, stop game, give retry button
      timeLeftText.text = 'TIME\'S UP!'
    }
    else if (!lost) timeLeftText.text = getTimeLeftText()

    if (bulletCount <= 0) {
      // LOST, stop game, give retry button
      bulletsLeftText.text = 'OUT OF AMMO!'
    }
    else if (!lost) bulletsLeftText.text = getBulletsLeftText()

    if (lost) {
      targetAnimatable?.stop()
    }
  }
}

function getLastFrame(animation) {
  return animation._keys[animation._keys.length - 1].frame
}


function buildWeiner() {
  // make the weiner model
  const skinMaterial = new StandardMaterial('skin', scene)
  skinMaterial.diffuseColor = new Color3(238/255,181/255,130/255)
  const length = 2
  const shaft = MeshBuilder.CreateCylinder('shaft', {
    height: length,
    diameterBottom: 1.2,
    diameterTop: .9,
  }, scene)
  shaft.position.y = length/2
  shaft.material = skinMaterial
  // weiner.parent = weiner
  const leftTesticle = MeshBuilder.CreateSphere('leftTesticle', {

  }, scene)
  leftTesticle.position.x = -.4
  leftTesticle.position.y = -length/2 + .1
  leftTesticle.position.z = -.3
  leftTesticle.material = skinMaterial
  leftTesticle.parent = shaft

  const rightTesticle = MeshBuilder.CreateSphere('rightTesticle', {
  }, scene)
  rightTesticle.position.x = .4
  rightTesticle.position.y = -length/2 + .1
  rightTesticle.position.z = -.3
  rightTesticle.material = skinMaterial
  rightTesticle.parent = shaft
  
  const tip = MeshBuilder.CreateSphere('tip', {
    diameter: 1.1
  }, scene)
  tip.position.y = length/2 - .1
  tip.material = skinMaterial
  tip.parent = shaft

  const weinerModel = Mesh.MergeMeshes([
    shaft,
    ...shaft.getChildMeshes()
  ])
  weinerModel.name = 'weinerModel'
  weinerModel.position = new Vector3(0, -1.2, .1)
  return weinerModel
}