import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

let camera, scene, renderer, controls, transformControls;
let plane, raycaster, pointer;
let isShiftDown = false, isCtrlDown = false, isAltDown = false;
let objects = [], walls = [];
let armModel = null;
let selectedObject = null;
const loadingScreen = document.getElementById('loading-screen');
const loadingMessage = document.getElementById('loading-message');
let roomWidth = 1000, roomDepth = 1000, roomHeight = 400;
let widthSlider = document.getElementById('roomWidth');
let depthSlider = document.getElementById('roomDepth');
let heightSlider = document.getElementById('roomHeight');
let widthValue = document.getElementById('widthValue');
let depthValue = document.getElementById('depthValue');
let heightValue = document.getElementById('heightValue');

const loadingManager = new THREE.LoadingManager();

loadingManager.onLoad = function () {
    console.log("All assets loaded!");
    fadeOutLoadingScreen();
    onAssetsLoaded();
};

init();
loadArmModel();

function init() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(700, 900, 1000);
    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const gridHelper = new THREE.GridHelper(2000, 40);
    scene.add(gridHelper);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    // Invisible Floor
    const floorGeometry = new THREE.PlaneGeometry(4000, 4000);
    floorGeometry.rotateX(-Math.PI / 2);
    const floorMaterial = new THREE.MeshBasicMaterial({ visible: false });
    plane = new THREE.Mesh(floorGeometry, floorMaterial);
    scene.add(plane);
    objects.push(plane);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x606060, 2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(1, 0.75, 0.5).normalize();
    scene.add(dirLight);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Camera Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    widthSlider.addEventListener("input", updateRoom);
    depthSlider.addEventListener("input", updateRoom);
    heightSlider.addEventListener("input", updateRoom);
    // Create Room Walls
    createWalls();
}

function loadArmModel() {
    const loader = new GLTFLoader(loadingManager);
    
    // Add DRACO Loader
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    loader.setDRACOLoader(dracoLoader);

    loader.load('./default_arm.glb', (gltf) => {
        armModel = gltf.scene;
        armModel.scale.set(100, 100, 100);

        const boundingBox = new THREE.Box3().setFromObject(armModel);
        const center = boundingBox.getCenter(new THREE.Vector3());
        armModel.position.set(-center.x, -boundingBox.min.y, -center.z);

        console.log("Arm model loaded successfully:", armModel);
    },
    (xhr) => console.log(`Loading Arm Model: ${Math.round(xhr.loaded / xhr.total * 100)}%`),
    (error) => console.error('Error loading GLTF model:', error));
}


function onAssetsLoaded() {
    console.log("All models are now ready!");

    setTimeout(() => {
        transformControls = new TransformControls(camera, renderer.domElement);
        scene.add(transformControls.getHelper());

        transformControls.addEventListener('dragging-changed', (event) => {
            controls.enabled = !event.value;
        });

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onDocumentKeyDown);
        document.addEventListener('keyup', onDocumentKeyUp);
        window.addEventListener('resize', onWindowResize);

        animate();
    }, 200);
}

function createWalls() {
    walls.forEach(w => scene.remove(w));
    walls = [];

    const halfW = roomWidth / 2;
    const halfD = roomDepth / 2;

    const wallMaterial = new THREE.MeshLambertMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.45
    });

    let wallGeometry1 = new THREE.BoxGeometry(roomWidth, roomHeight, 10);
    let wall1 = new THREE.Mesh(wallGeometry1, wallMaterial);
    wall1.position.set(0, roomHeight / 2, halfD);
    scene.add(wall1);
    walls.push(wall1);

    let wallGeometry2 = new THREE.BoxGeometry(roomWidth, roomHeight, 10);
    let wall2 = new THREE.Mesh(wallGeometry2, wallMaterial);
    wall2.position.set(0, roomHeight / 2, -halfD);
    scene.add(wall2);
    walls.push(wall2);

    let wallGeometry3 = new THREE.BoxGeometry(10, roomHeight, roomDepth);
    let wall3 = new THREE.Mesh(wallGeometry3, wallMaterial);
    wall3.position.set(halfW, roomHeight / 2, 0);
    scene.add(wall3);
    walls.push(wall3);

    let wallGeometry4 = new THREE.BoxGeometry(10, roomHeight, roomDepth);
    let wall4 = new THREE.Mesh(wallGeometry4, wallMaterial);
    wall4.position.set(-halfW, roomHeight / 2, 0);
    scene.add(wall4);
    walls.push(wall4);

    render();
}

function onPointerDown(event) {
    if (event.target.closest('#uiPanel')) return;
    event.preventDefault();

    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
        let clickedObject = intersects[0].object;

        while (clickedObject.parent && clickedObject.parent !== scene) {
            clickedObject = clickedObject.parent;
        }

        if (isShiftDown) {
            if (clickedObject === plane || walls.includes(clickedObject)) {
                console.warn("Cannot delete the floor or walls.");
                return;
            }

            scene.remove(clickedObject);
            objects = objects.filter(obj => obj !== clickedObject);
            deselectObject();
            render();

        } else if (isCtrlDown && armModel) {
            const objectToPlace = armModel.clone();
            objectToPlace.position.copy(intersects[0].point).add(intersects[0].face.normal);
            objectToPlace.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
            objectToPlace.position.x += 8;
            objectToPlace.position.y += -22;
            scene.add(objectToPlace);
            objects.push(objectToPlace);
            render();
        } else if (isAltDown){
            if (!walls.includes(clickedObject) && clickedObject !== plane) {
                selectObject(clickedObject);
            } else {
                deselectObject();
            }
        } else {
            return;
        }


    } else {
        deselectObject();
    }
}

function selectObject(object) {
    deselectObject();
    selectedObject = object;
    transformControls.attach(object);
    render();
}

function deselectObject() {
    if (selectedObject) {
        transformControls.detach();
        selectedObject = null;
    }
    render();
}

function fadeOutLoadingScreen() {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 1000);
}

function onDocumentKeyDown(event) {
    if (event.key === 'Shift') isShiftDown = true;
    if (event.key === 'Control') isCtrlDown = true;
    if (event.key === 'Alt') isAltDown = true;

    switch (event.key) {
        case 'g':
            transformControls.setMode('translate');
            break;
        case 'r':
            transformControls.setMode('rotate');
            break;
        case 's':
            transformControls.setMode('scale');
            break;
    }
}

function onDocumentKeyUp(event) {
    if (event.key === 'Shift') isShiftDown = false;
    if (event.key === 'Control') isCtrlDown = false;
    if (event.key === 'Alt') isAltDown = false;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    renderer.render(scene, camera);
}

function updateRoom() {
    roomWidth = parseInt(widthSlider.value);
    roomDepth = parseInt(depthSlider.value);
    roomHeight = parseInt(heightSlider.value);

    widthValue.textContent = roomWidth;
    depthValue.textContent = roomDepth;
    heightValue.textContent = roomHeight;

    createWalls();
}
