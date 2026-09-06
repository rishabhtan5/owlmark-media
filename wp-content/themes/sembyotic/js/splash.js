// import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';
// import { FontLoader } from 'https://cdn.skypack.dev/three@0.136.0/examples/jsm/loaders/FontLoader.js';
import * as THREE from './three-r136.js';
import { FontLoader } from './three-r136-FontLoader.js';
import { Gradient } from './gradient.js'

class Splash {
	constructor(node, font, particleImg){
		this.font = font;
		this.particleImg = particleImg;
		this.container = node.querySelector('.splash-container');
		this.heatzone = node.querySelector('.splash-heatzone');
		this.raycaster = new THREE.Raycaster();
		this.colorChange = new THREE.Color();
		this.isInHeatzone = false;
		this.bounding = this.container.getBoundingClientRect();
		this.running = false;
		
		this.cursor = {
			rel: new THREE.Vector2(-1, 1),
			abs: {x: 0, y: 0}
		};
		this.pointerActive = false;

		// Strong orange: 0xff4000
		// Light orange: 0xf25a2c

		// Get text and add line break
		let text = node.getAttribute('data-text').split(' ');
			text.splice(3, 0, '\n');
			text = text.join(' ');


		this.params = {
			text: '     ' + text,
			strokeAmount: 1500,
			fillAmount: 0,
			precision: 3,
			particleSize: .7,
			forgroundTextColor: 0xf25a2c,
			mouseleave: {
				backgroundTextColor: 0x19adb8,
				areaTextColor: 0xff4000,
				areaRadius: 10
			},
			mouseenter: {
				backgroundTextColor: 0x19adb8,
				areaTextColor: 0xff4000,
				areaRadius: 10
			},
			textSize: 8,
			area: 250,
			ease: .05,
		}

		if (window.innerWidth < 1024){
			this.params.strokeAmount = 1150;
			this.params.particleSize = .58;
			this.params.area = 135;
			this.params.mouseleave.areaRadius = 6;
			this.params.mouseenter.areaRadius = 7;
		}

		// Gradients
		const gradientCanvas = document.createElement('canvas');
		gradientCanvas.id = 'splash-gradients';
		this.container.appendChild(gradientCanvas);
		
		const gradient = new Gradient();
		gradient.amp = 0; // Smooth blending
		gradient.initGradient(gradientCanvas);

		// Scene
		this.scene = new THREE.Scene();
		this.scene.background = null;

		// Camera
		this.camera = new THREE.PerspectiveCamera( 65, this.container.clientWidth /  this.container.clientHeight, 1, 10000 );
		this.camera.position.set( 0,0, 100 );

		// Render
		this.renderer = new THREE.WebGLRenderer({alpha: true});
		this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
		this.renderer.setPixelRatio(Math.min( window.devicePixelRatio, 2));
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		this.container.appendChild(this.renderer.domElement);
		// this.startLoop();

		// Plane
		const geometry = new THREE.PlaneGeometry( this.visibleWidthAtZDepth( 100, this.camera ), this.visibleHeightAtZDepth( 100, this.camera ));
		const material = new THREE.MeshBasicMaterial({color: 0x00ff00, transparent: true});
		this.planeArea = new THREE.Mesh(geometry, material);
		this.planeArea.visible = false;
		
		// Particles
		this.addParticles();
		
		// Events
		this.onResize = () => {
			this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
			this.setParticleScale();
		}

		this.onScroll = () => {
			this.updateMouse(this.cursor.abs.x, this.cursor.abs.y);

			// if (this.bounding.top >= window.innerHeight || this.bounding.bottom <= 0){ // Do not work with fixed section
			if (window.pageYOffset >= window.innerHeight){
				this.stopLoop();
			}
			else{
				this.startLoop();
			}
		}

		this.onMouseEnter = (event) => {
			this.pointerActive = true;
			this.updateMouse(event.clientX, event.clientY);
			const vector = new THREE.Vector3(this.cursor.rel.x, this.cursor.rel.y, 0.5);
			vector.unproject(this.camera);
			const dir = vector.sub(this.camera.position).normalize();
			const distance = - this.camera.position.z / dir.z;
			this.currenPosition = this.camera.position.clone().add(dir.multiplyScalar(distance));
			this.isInHeatzone = true;
			this.params.ease = .01;
		}

		this.onMouseLeave = () => {
			this.pointerActive = false;
			this.isInHeatzone = false;
			this.params.ease = .05;
		}

		this.onMouseMove = (event) => {
			this.pointerActive = true;
			this.updateMouse(event.clientX, event.clientY);
		}

		this.onTouchStart = (event) => {
			this.pointerActive = true;
			this.isInHeatzone = true;
			this.params.ease = .012;
			this.updateTouch(event);
		}

		this.onTouchMove = (event) => {
			this.pointerActive = true;
			this.isInHeatzone = true;
			this.params.ease = .012;
			this.updateTouch(event);
		}

		this.onTouchEnd = () => {
			this.pointerActive = false;
			this.params.ease = .035;
		}

		makeClassToggable(this);
	}

	toggle(){
		return true;
	}

	enable(){
		this.build();
	}

	desable(){
		this.destroy();
	}

	build(){
		// Add listeners
		window.addEventListener('resize', this.onResize);
		window.addEventListener('scroll', this.onScroll);
		document.addEventListener( 'mousemove', this.onMouseMove);
		this.heatzone.addEventListener( 'mouseenter', this.onMouseEnter);
		this.heatzone.addEventListener( 'mouseleave', this.onMouseLeave);
		this.container.addEventListener('touchstart', this.onTouchStart, {passive: true});
		this.container.addEventListener('touchmove', this.onTouchMove, {passive: true});
		this.container.addEventListener('touchend', this.onTouchEnd, {passive: true});
		this.container.addEventListener('touchcancel', this.onTouchEnd, {passive: true});
		this.setParticleScale();

		// Start
		this.startLoop();
	}

	destroy(){
		// Remove listeners
		window.removeEventListener('resize', this.onResize);
		window.removeEventListener('scroll', this.onScroll);
		document.removeEventListener( 'mousemove', this.onMouseMove);
		this.heatzone.removeEventListener( 'mouseenter', this.onMouseEnter);
		this.heatzone.removeEventListener( 'mouseleave', this.onMouseLeave);
		this.container.removeEventListener('touchstart', this.onTouchStart);
		this.container.removeEventListener('touchmove', this.onTouchMove);
		this.container.removeEventListener('touchend', this.onTouchEnd);
		this.container.removeEventListener('touchcancel', this.onTouchEnd);

		// Stop
		this.stopLoop();
	}

	updateBounding(){
		this.bounding = this.container.getBoundingClientRect();
	}

	updateMouse(x = null, y = null){
		// Bounding could be update just on scroll but splash section 
		// is loaded with a Y translation (pixel transition) which break the
		// computation.
		this.updateBounding();

		this.cursor.abs.x = x !== null ? x : this.cursor.abs.x;
		this.cursor.abs.y = y !== null ? y : this.cursor.abs.y;

		this.cursor.rel.x = ((this.cursor.abs.x - this.bounding.x) / document.documentElement.clientWidth) * 2 - 1;
		this.cursor.rel.y = - ((this.cursor.abs.y - this.bounding.y) / window.innerHeight) * 2 + 1;
	}

	updateTouch(event){
		if (!event.touches || !event.touches.length){
			return;
		}

		this.updateMouse(event.touches[0].clientX, event.touches[0].clientY);
	}

	buildParticlesDataset(geometry, shapes){
		const precision = 10 ** this.params.precision;
		const coordonates = [];
		let holeShapes = [];

		for (let q = 0; q < shapes.length; q++){
			let shape = shapes[q];

			if (shape.holes && shape.holes.length > 0){
				for (let  j = 0; j < shape.holes.length; j ++){
					let  hole = shape.holes[j];
					holeShapes.push(hole);
				}
			}
		}

		shapes.push.apply(shapes, holeShapes);
		
		// Create points along paths
		for (let  x = 0; x < shapes.length; x ++ ){
			const amountPoints = ( shapes[x].type == 'Path') ? this.params.strokeAmount / 2 : this.params.strokeAmount;
			let points = shapes[x].getSpacedPoints(amountPoints);

			points.forEach((element, z) => {
				coordonates.push([
					Math.floor(element.x * precision) / precision,
					Math.floor(element.y * precision) / precision
				]);
			});
		}

	    return coordonates;
	}

	addParticles(){ 
		// Create text
		let shapes = this.font.generateShapes(this.params.text, this.params.textSize);
		let geometry = new THREE.ShapeBufferGeometry(shapes).toNonIndexed();
		geometry.computeBoundingBox();
		// geometry.center();

		// Particles
		const dataset = this.buildParticlesDataset(geometry, shapes);

		let particles = [];
		let colors = [];
		let sizes = [];

		for (let i = dataset.length - 1; i >= 0; i--){
			particles.push(new THREE.Vector3(dataset[i][0], dataset[i][1], 0));
			colors.push(this.colorChange.r, this.colorChange.g, this.colorChange.b);
			sizes.push(1);
		}

		const xMid = - 0.5 * ( geometry.boundingBox.max.x - geometry.boundingBox.min.x );
		const yMid =  (geometry.boundingBox.max.y - geometry.boundingBox.min.y) / 6;
		this.particleBounds = {
			width: geometry.boundingBox.max.x - geometry.boundingBox.min.x,
			height: geometry.boundingBox.max.y - geometry.boundingBox.min.y
		};
		// const yMid =  (geometry.boundingBox.max.y - geometry.boundingBox.min.y) / 2.85;

		let geoParticles = new THREE.BufferGeometry().setFromPoints(particles);
		geoParticles.translate(xMid, yMid, 0);
		geoParticles.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3));
		geoParticles.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

		const matParticles = new THREE.ShaderMaterial({
			uniforms: {
				color: {value: new THREE.Color(0xffffff)},
				pointTexture: {value: this.particleImg}
			},
			vertexShader: document.getElementById('splash-vertexshader').textContent,
			fragmentShader: document.getElementById('splash-fragmentshader').textContent,
			blending: THREE.AdditiveBlending,
			// blending: THREE.MultiplyBlending,
			// blending: THREE.SubtractiveBlending,
			depthTest: false,
			transparent: true,
		});

		// Full opacity text
		// geometry.translate( xMid, yMid, 0 );
		// this.scene.add( new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0x000000})) );

		this.particles = new THREE.Points(geoParticles, matParticles);
		this.scene.add(this.particles);
		this.setParticleScale();

		this.geometryCopy = new THREE.BufferGeometry();
		this.geometryCopy.copy(this.particles.geometry);	
	}

	setParticleScale(){
		if (!this.particles || !this.particleBounds){
			return;
		}

		if (window.innerWidth >= 1024){
			this.particles.scale.setScalar(1);
			return;
		}

		const viewWidth = this.visibleWidthAtZDepth(100, this.camera) * .52;
		const viewHeight = this.visibleHeightAtZDepth(100, this.camera) * .46;
		const scale = Math.min(.46, viewWidth / this.particleBounds.width, viewHeight / this.particleBounds.height);
		this.particles.scale.setScalar(Math.max(.09, scale));
	}

	visibleHeightAtZDepth(depth, camera){
		const cameraOffset = camera.position.z;
		if ( depth < cameraOffset ) depth -= cameraOffset;
		else depth += cameraOffset;

		const vFOV = camera.fov * Math.PI / 180; 

		return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
	}

	visibleWidthAtZDepth(depth, camera){
		const height = this.visibleHeightAtZDepth(depth, camera);
		return height * camera.aspect;
	}

	distance (x1, y1, x2, y2){
		return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
	}

	startLoop(){
		if (this.running) return;

		this.running = true;
		this.renderer.setAnimationLoop(() => {
			this.render();
		});
	}

	stopLoop(){
		if (!this.running) return;

		this.running = false;
		this.renderer.setAnimationLoop(null);
	}

	render(){
		const time = ((.001 * performance.now()) % 12) / 12;
		// const zigzagTime = (1 + (Math.sin( time * 2 * Math.PI )))/6;
		const mobileHero = window.innerWidth < 1024;

		if (mobileHero && !this.pointerActive){
			const drift = performance.now() * .00035;
			const x = this.bounding.x + this.bounding.width * (.5 + Math.cos(drift) * .32);
			const y = this.bounding.y + this.bounding.height * (.52 + Math.sin(drift * 1.35) * .28);
			this.isInHeatzone = true;
			this.params.ease = .025;
			this.updateMouse(x, y);
		}

		this.raycaster.setFromCamera(this.cursor.rel, this.camera);

		const intersects = this.raycaster.intersectObject(this.planeArea);

		if (intersects.length <= 0){
			return;
		}

		// Handle interactions
		const pos = this.particles.geometry.attributes.position;
		const copy = this.geometryCopy.attributes.position;
		const coulors = this.particles.geometry.attributes.customColor;
		const size = this.particles.geometry.attributes.size;

		const mx = intersects[ 0 ].point.x;
		const my = intersects[ 0 ].point.y;
		const mz = intersects[ 0 ].point.z;

		for (let i = 0, l = pos.count; i < l; i++){
			const initX = copy.getX(i);
			const initY = copy.getY(i);
			const initZ = copy.getZ(i);

			let px = pos.getX(i);
			let py = pos.getY(i);
			let pz = pos.getZ(i);

			// Set forefront text color
			this.colorChange.setHex(this.params.forgroundTextColor);
			coulors.setXYZ( i, this.colorChange.r, this.colorChange.g, this.colorChange.b )
			coulors.needsUpdate = true;

			size.array[ i ]  = this.params.particleSize;
			size.needsUpdate = true;

			let dx = mx - px;
			let dy = my - py;
			const dz = mz - pz;

			const mouseDistance = this.distance( mx, my, px, py )
			let d = ( dx = mx - px ) * dx + ( dy = my - py ) * dy;
			const f = - this.params.area/d;

			if (this.isInHeatzone){ // Mouse enter
				const t = Math.atan2( dy, dx );
				px -= f * Math.cos( t );
				py -= f * Math.sin( t );

				// Background text color
				if (i%5==0){
					// this.colorChange.setHSL(.5 + zigzagTime, 1.0 , .5);
					this.colorChange.setHex(this.params.mouseenter.backgroundTextColor);
					coulors.setXYZ( i, this.colorChange.r, this.colorChange.g, this.colorChange.b )
					coulors.needsUpdate = true;
				}

				// If particle far away from its initial position 
				if ((px > (initX + this.params.mouseenter.areaRadius)) || ( px < (initX - this.params.mouseenter.areaRadius)) || (py > (initY + this.params.mouseenter.areaRadius) || ( py < (initY - this.params.mouseenter.areaRadius)))){
					this.colorChange.setHex(this.params.mouseenter.areaTextColor);
					coulors.setXYZ( i, this.colorChange.r, this.colorChange.g, this.colorChange.b )
					coulors.needsUpdate = true;
				}

			}
			else{ // Mouse leaves
				if (mouseDistance < this.params.area){
					// Create background text by discriminating particles (every 5)
					if (i%5==0){
						const t = Math.atan2( dy, dx );
						px -= .03 * Math.cos( t );
						py -= .03 * Math.sin( t );

						// this.colorChange.setHSL( .15 , 1.0 , .5 );

						// Background text color
						this.colorChange.setHex(this.params.mouseleave.backgroundTextColor);
						coulors.setXYZ( i, this.colorChange.r, this.colorChange.g, this.colorChange.b )
						coulors.needsUpdate = true;

						// size.array[ i ]  =  this.params.particleSize / 1.2;
						// size.needsUpdate = true;
					}
					else{
						const t = Math.atan2( dy, dx );
						px += f * Math.cos( t );
						py += f * Math.sin( t );

						// Move particles
						pos.setXYZ( i, px, py, pz );
						pos.needsUpdate = true;

						// size.array[ i ]  = this.params.particleSize * 1.3 ;
						// size.needsUpdate = true;
					}

					// If particle far away from its initial position 
					if ((px > (initX + this.params.mouseleave.areaRadius)) || ( px < (initX - this.params.mouseleave.areaRadius)) || (py > (initY + this.params.mouseleave.areaRadius) || ( py < (initY - this.params.mouseleave.areaRadius)))){
						this.colorChange.setHex(this.params.mouseleave.areaTextColor);
						coulors.setXYZ( i, this.colorChange.r, this.colorChange.g, this.colorChange.b )
						coulors.needsUpdate = true;

						// size.array[ i ]  = this.params.particleSize / 1.8;
						// size.needsUpdate = true;

					}
				}
			}

			px += ( initX  - px ) * this.params.ease;
			py += ( initY  - py ) * this.params.ease;
			pz += ( initZ  - pz ) * this.params.ease;

			// Move particle
			pos.setXYZ(i, px, py, pz);
			pos.needsUpdate = true;
		}

		this.renderer.render(this.scene, this.camera);
	}
}

let splash;

function init(scope = document){
	const node = scope.querySelector('.splash');

	if (!node){
		return;
	}

	let manager = new THREE.LoadingManager();
	
	manager.onLoad = function(){ 
		// const text = '     Turning bright ideas\ninto digital realities.';
		splash = new Splash(node, typo, particle);
	}

	var typo = null;

	const loader = new FontLoader(manager);

	// Load font (json conversion tool: https://gero3.github.io/facetype.js/)
	const font = loader.load(SPL_CONSTANTS.TPL_DIR_URI + '/fonts/nuckle/nuckle-semibold.json', (font) => {
		typo = font;
	});

	// Load particle
	const particle = new THREE.TextureLoader(manager).load(SPL_CONSTANTS.TPL_DIR_URI + '/img/splash-particle.png');
}

// Init when injected
init();

// Init on barba enter
window.addEventListener('barbaAfterEnter', (e) => {
	init(e.detail.next.container);
});

// Destroy on barba leave
window.addEventListener('barbaAfterLeave', () => {
	if (splash){
		splash.destroy();
		splash = null;
	}
});

// Dev
if (SPL_CONSTANTS.WP_ENVIRONMENT_TYPE == 'development'){
	window.addEventListener('click', () => {
		if (splash){
			splash.running ? splash.stopLoop() : splash.startLoop();
		}
	});
}
