import Modeler from 'lib/Modeler';
import Viewer from 'lib/Viewer';
import NavigatedViewer from 'lib/NavigatedViewer';

import Clipboard from 'diagram-js/lib/features/clipboard/Clipboard';

import TestContainer from 'mocha-test-container-support';

import {
  createCanvasEvent
} from '../util/MockEvents';

import {
  setBpmnJS,
  clearBpmnJS,
  collectTranslations
} from 'test/TestHelper';

import { getDi } from 'lib/util/ModelUtil';
import { assign } from 'min-dash';


var singleStart = window.__env__ && window.__env__.SINGLE_START === 'modeler';


describe('Modeler', function() {

  var container;

  var modeler;

  beforeEach(function() {
    container = TestContainer.get(this);
  });

  function createModeler(xml) {

    clearBpmnJS();

    modeler = new Modeler({
      container: container,
      keyboard: {
        bindTo: document
      }
    });

    var eventBus = modeler.get('eventBus');

    eventBus.on([ 'render.shape', 'render.connection' ], 5000, function(event, context) {
      console.log(event, context);
      context.attrs = assign({}, context.attrs, {
        stroke: 'pink',

        fill: '#eeeeee'
      });
      console.log(context);
    });


    setBpmnJS(modeler);

    return modeler.importXML(xml).then(function(result) {
      return { error: null, warnings: result.warnings, modeler: modeler };
    }).catch(function(err) {
      return { error: err, warnings: err.warnings, modeler: modeler };
    });
  }


  (singleStart ? it.only : it)('should import simple process', function() {
    var xml = require('../fixtures/bpmn/simple.bpmn');
    return createModeler(xml).then(function(result) {

      expect(result.error).not.to.exist;
    });
  });


  it('should import collaboration', function() {
    var xml = require('../fixtures/bpmn/collaboration-message-flows.bpmn');
    return createModeler(xml).then(function(result) {

      expect(result.error).not.to.exist;
    });
  });


  it('should import nested lanes', function() {
    var xml = require('./features/modeling/lanes/lanes.bpmn');
    return createModeler(xml).then(function(result) {

      expect(result.error).not.to.exist;
    });
  });


  it('should import ioSpecification', function() {
    var xml = require('./features/modeling/input-output/DataInputOutput.bpmn');
    return createModeler(xml).then(function(result) {

      expect(result.error).not.to.exist;
    });
  });


  it.skip('should import complex', function() {
    var xml = require('../fixtures/bpmn/complex.bpmn');
    return createModeler(xml).then(function(result) {

      expect(result.error).not.to.exist;
    });
  });


  it('should not import empty definitions', function() {
    var xml = require('../fixtures/bpmn/empty-definitions.bpmn');

    // given
    return createModeler(xml).then(function(result) {

      var modeler = result.modeler;

      // when
      return modeler.importXML(xml);
    }).catch(function(err) {

      // then
      expect(err.message).to.equal('no diagram to display');
    });
  });


  it('should re-import simple process', function() {

    var xml = require('../fixtures/bpmn/simple.bpmn');

    // given
    return createModeler(xml).then(function(result) {

      var modeler = result.modeler;

      // when
      // mimic re-import of same diagram
      return modeler.importXML(xml);
    }).then(function(result) {

      var warnings = result.warnings;

      // then
      expect(warnings).to.be.empty;
    });
  });


  it('should switch between diagrams', function() {

    var multipleXML = require('../fixtures/bpmn/multiple-diagrams.bpmn');

    // given
    return createModeler(multipleXML).then(function(result) {

      var modeler = result.modeler;
      var err = result.error;

      if (err) {
        throw err;
      }

      // when
      return modeler.open('BpmnDiagram_2');
    }).then(function(result) {

      var warnings = result.warnings;

      // then
      expect(warnings).to.be.empty;
    });
  });


  !collectTranslations && describe('translate support', function() {

    var xml = require('../fixtures/bpmn/simple.bpmn');

    it('should allow translation of multi-lingual strings', function() {

      return createModeler(xml).then(function(result) {

        var modeler = result.modeler;
        var err = result.error;

        if (err) {
          throw err;
        }

        // given
        var translate = modeler.get('translate');

        // assume
        expect(translate).to.exist;

        // when
        var interpolatedString = translate('HELLO {you}!', { you: 'WALT' });

        // then
        expect(interpolatedString).to.eql('HELLO WALT!');
      });

    });

  });


  describe('overlay support', function() {

    it('should allow to add overlays', function() {

      var xml = require('../fixtures/bpmn/simple.bpmn');

      return createModeler(xml).then(function(result) {

        var modeler = result.modeler;
        var err = result.error;

        if (err) {
          throw err;
        }

        // given
        var overlays = modeler.get('overlays'),
            elementRegistry = modeler.get('elementRegistry');

        // assume
        expect(overlays).to.exist;
        expect(elementRegistry).to.exist;


        // when
        overlays.add('SubProcess_1', 'badge', {
          position: {
            bottom: 0,
            right: 0
          },
          html: '<div style="max-width: 50px">YUP GREAT STUFF!</div>'
        });

        overlays.add('StartEvent_1', 'badge', {
          position: {
            top: 0,
            left: 0
          },
          html: '<div style="max-width: 50px">YUP GREAT STUFF!</div>'
        });

        // then
        expect(overlays.get({ element: 'SubProcess_1', type: 'badge' })).to.have.length(1);
        expect(overlays.get({ element: 'StartEvent_1', type: 'badge' })).to.have.length(1);
      });

    });

  });


  describe('editor actions support', function() {

    it('should ship all actions', function() {

      // given
      var expectedActions = [
        'undo',
        'redo',
        'copy',
        'paste',
        'stepZoom',
        'zoom',
        'removeSelection',
        'moveCanvas',
        'moveSelection',
        'selectElements',
        'spaceTool',
        'lassoTool',
        'handTool',
        'globalConnectTool',
        'distributeElements',
        'alignElements',
        'setColor',
        'directEditing',
        'find',
        'moveToOrigin'
      ];

      var modeler = new Modeler();

      // when
      var editorActions = modeler.get('editorActions');

      // then
      var actualActions = editorActions.getActions();

      expect(actualActions).to.eql(expectedActions);
    });

  });


  describe('bendpoint editing support', function() {

    it('should allow to edit bendpoints', function() {

      var xml = require('../fixtures/bpmn/simple.bpmn');

      return createModeler(xml).then(function(result) {

        var modeler = result.modeler;
        var err = result.error;

        if (err) {
          throw err;
        }

        // given
        var bendpointMove = modeler.get('bendpointMove'),
            dragging = modeler.get('dragging'),
            elementRegistry = modeler.get('elementRegistry');

        // assume
        expect(bendpointMove).to.exist;

        // when
        bendpointMove.start(
          createCanvasEvent({ x: 0, y: 0 }),
          elementRegistry.get('SequenceFlow_1'),
          1
        );
        dragging.move(createCanvasEvent({ x: 200, y: 200 }));
      });

    });

  });


  describe('color support', function() {

    it('should allow color changes', function() {

      var xml = require('../fixtures/bpmn/simple.bpmn');

      return createModeler(xml).then(function(result) {

        var modeler = result.modeler;

        // given
        var modeling = modeler.get('modeling'),
            elementRegistry = modeler.get('elementRegistry'),
            eventShape = elementRegistry.get('StartEvent_2');

        // when
        // set color for StartEvent_2
        modeling.setColor(eventShape, {
          fill: 'FUCHSIA',
          stroke: 'YELLOW'
        });

        // test saving process to get XML
        return modeler.saveXML({ format: true });
      }).then(function(result) {
        var xml = result.xml;

        expect(xml).not.to.contain('di="[object Object]"');
      });
    });
  });


  describe('configuration', function() {

    // given
    var xml = require('../fixtures/bpmn/simple.bpmn');

    it('should configure Canvas', function() {

      // given
      var modeler = new Modeler({
        container: container,
        canvas: {
          deferUpdate: true
        }
      });

      // when
      return modeler.importXML(xml).then(function() {

        var canvasConfig = modeler.get('config.canvas');

        // then
        expect(canvasConfig.deferUpdate).to.be.true;
      });
    });
  });


  describe('ids', function() {

    it('should provide ids with moddle', function() {

      // given
      var modeler = new Modeler({ container: container });

      // when
      var moddle = modeler.get('moddle');

      // then
      expect(moddle.ids).to.exist;
    });


    it('should populate ids on import', function() {

      // given
      var xml = require('../fixtures/bpmn/simple.bpmn');

      var modeler = new Modeler({ container: container });

      var moddle = modeler.get('moddle');
      var elementRegistry = modeler.get('elementRegistry');

      // when
      return modeler.importXML(xml).then(function() {

        var subProcess = elementRegistry.get('SubProcess_1').businessObject;
        var bpmnEdge = getDi(elementRegistry.get('SequenceFlow_3'));

        // then
        expect(moddle.ids.assigned('SubProcess_1')).to.eql(subProcess);
        expect(moddle.ids.assigned('BPMNEdge_SequenceFlow_3')).to.eql(bpmnEdge);
      });

    });


    it('should clear ids before re-import', function() {

      // given
      var someXML = require('../fixtures/bpmn/simple.bpmn'),
          otherXML = require('../fixtures/bpmn/basic.bpmn');

      var modeler = new Modeler({ container: container });

      var moddle = modeler.get('moddle');
      var elementRegistry = modeler.get('elementRegistry');

      // when
      return modeler.importXML(someXML).then(function() {

        return modeler.importXML(otherXML);
      }).then(function() {

        var task = elementRegistry.get('Task_1').businessObject;

        // then
        // not in other.bpmn
        expect(moddle.ids.assigned('SubProcess_1')).to.be.false;

        // in other.bpmn
        expect(moddle.ids.assigned('Task_1')).to.eql(task);
      });
    });
  });


  it('should handle errors', function() {

    var xml = 'invalid stuff';

    var modeler = new Modeler({ container: container });

    return modeler.importXML(xml).catch(function(err) {

      expect(err).to.exist;
    });
  });


  it('should error when accessing <di> from businessObject', function() {

    var xml = require('../fixtures/bpmn/simple.bpmn');

    var modeler = new Modeler({ container: container });

    return modeler.importXML(xml).then(function() {

      // given
      var elementRegistry = modeler.get('elementRegistry'),
          shape = elementRegistry.get('Task_1');

      // then
      expect(shape.di).to.exist;
      expect(function() {
        shape.businessObject.di;
      }).to.throw(/The di is available through the diagram element only./);
    });
  });


  it('should create new diagram', function() {
    var modeler = new Modeler({ container: container });
    return modeler.createDiagram();
  });


  it('should create new diagram - Legacy', function(done) {
    var modeler = new Modeler({ container: container });
    modeler.createDiagram(function(err, warnings) {

      expect(warnings).to.exist;
      expect(warnings).to.have.length(0);

      done(err);
    });
  });


  describe('dependency injection', function() {

    it('should provide self as <bpmnjs>', function() {

      var xml = require('../fixtures/bpmn/simple.bpmn');

      return createModeler(xml).then(function(result) {

        var modeler = result.modeler;
        var err = result.error;

        if (err) {
          throw err;
        }

        expect(modeler.get('bpmnjs')).to.equal(modeler);
      });
    });


    it('should allow Diagram#get before import', function() {

      // when
      var modeler = new Modeler({ container: container });

      // then
      var eventBus = modeler.get('eventBus');

      expect(eventBus).to.exist;
    });


    it('should keep references to services across re-import', function() {

      // given
      var someXML = require('../fixtures/bpmn/simple.bpmn'),
          otherXML = require('../fixtures/bpmn/basic.bpmn');

      var modeler = new Modeler({ container: container });

      var eventBus = modeler.get('eventBus'),
          canvas = modeler.get('canvas');

      // when
      return modeler.importXML(someXML).then(function() {

        // then
        expect(modeler.get('canvas')).to.equal(canvas);
        expect(modeler.get('eventBus')).to.equal(eventBus);

        return modeler.importXML(otherXML);
      }).then(function() {

        // then
        expect(modeler.get('canvas')).to.equal(canvas);
        expect(modeler.get('eventBus')).to.equal(eventBus);
      });

    });


    it('should inject mandatory modules', function() {

      // given
      var xml = require('../fixtures/bpmn/simple.bpmn');

      // when
      return createModeler(xml).then(function(result) {

        var modeler = result.modeler;
        var err = result.error;

        // then

        if (err) {
          throw err;
        }

        expect(modeler.get('alignElements')).to.exist;
        expect(modeler.get('autoPlace')).to.exist;
        expect(modeler.get('bpmnAutoResize')).to.exist;
        expect(modeler.get('autoScroll')).to.exist;
        expect(modeler.get('bendpoints')).to.exist;
        expect(modeler.get('bpmnCopyPaste')).to.exist;
        expect(modeler.get('bpmnSearch')).to.exist;
        expect(modeler.get('contextPad')).to.exist;
        expect(modeler.get('copyPaste')).to.exist;
        expect(modeler.get('alignElements')).to.exist;
        expect(modeler.get('distributeElements')).to.exist;
        expect(modeler.get('editorActions')).to.exist;
        expect(modeler.get('keyboard')).to.exist;
        expect(modeler.get('keyboardMoveSelection')).to.exist;
        expect(modeler.get('labelEditingProvider')).to.exist;
        expect(modeler.get('modeling')).to.exist;
        expect(modeler.get('move')).to.exist;
        expect(modeler.get('paletteProvider')).to.exist;
        expect(modeler.get('resize')).to.exist;
        expect(modeler.get('snapping')).to.exist;
      });

    });

  });


  describe('copy and paste', function() {

    var m1, m2;

    afterEach(function() {
      if (m1) {
        m1.destroy();
      }

      if (m2) {
        m2.destroy();
      }
    });

    function isNamedA(element) {
      return element.type !== 'label' && element.businessObject.name === 'A';
    }


    it('should share Clipboard', function() {

      var aXML = require('./Modeler.copy-paste.a.bpmn');
      var bXML = require('./Modeler.copy-paste.b.bpmn');

      var clipboardModule = {
        'clipboard': [ 'value', new Clipboard() ]
      };

      m2 = new Modeler({
        container: container,
        additionalModules: [
          clipboardModule
        ]
      });

      m1 = new Modeler({
        container: container,
        additionalModules: [
          clipboardModule
        ]
      });

      return Promise.all([
        m1.importXML(aXML),
        m2.importXML(bXML)
      ]).then(function() {

        // given
        // copy element <A> from m1
        m1.invoke(function(selection, elementRegistry, editorActions) {
          selection.select(elementRegistry.get('A'));

          editorActions.trigger('copy');
        });

        // TODO(nikku): needed for our canvas utilities to work
        setBpmnJS(m2);

        m2.invoke(function(dragging, editorActions, elementRegistry) {

          var processElement = elementRegistry.get('Process_1');

          // when
          // paste element <A> to m2, first try
          editorActions.trigger('paste');
          dragging.move(createCanvasEvent({ x: 150, y: 150 }));
          dragging.move(createCanvasEvent({ x: 170, y: 150 }));
          dragging.hover({ element: processElement });

          dragging.end();

          // then
          expect(elementRegistry.get('A')).to.exist;
          expect(elementRegistry.filter(isNamedA)).to.have.lengthOf(1);

          // but when
          // paste element <A> to m2, second try
          editorActions.trigger('paste');
          dragging.move(createCanvasEvent({ x: 150, y: 150 }));
          dragging.move(createCanvasEvent({ x: 300, y: 150 }));
          dragging.hover({ element: processElement });

          dragging.end();

          // then
          expect(elementRegistry.filter(isNamedA)).to.have.lengthOf(2);
        });

      });

    });

  });


  describe('drill down', function() {

    it('should allow drill down into collapsed sub-process', function() {
      var xml = require('../fixtures/bpmn/collapsed-sub-process.bpmn');

      return createModeler(xml).then(function() {
        var drilldown = container.querySelector('.bjs-drilldown');
        var breadcrumbs = container.querySelector('.bjs-breadcrumbs');

        // assume
        expect(drilldown).to.exist;
        expect(breadcrumbs).to.exist;
        expect(breadcrumbs.classList.contains('djs-element-hidden')).to.be.true;

        // when
        drilldown.click();

        // then
        expect(breadcrumbs.classList.contains('djs-element-hidden')).to.be.false;
      });

    });

  });


  it('should expose Viewer and NavigatedViewer', function() {
    expect(Modeler.Viewer).to.equal(Viewer);
    expect(Modeler.NavigatedViewer).to.equal(NavigatedViewer);
  });

});
