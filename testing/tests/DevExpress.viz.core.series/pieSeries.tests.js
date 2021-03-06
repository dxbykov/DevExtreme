"use strict";

var $ = require("jquery"),
    vizMocks = require("../../helpers/vizMocks.js"),
    pointModule = require("viz/series/points/base_point"),
    labelModule = require("viz/series/points/label"),
    Series = require("viz/series/base_series").Series;

/* global insertMockFactory, MockTranslator */
require("../../helpers/chartMocks.js");

require("viz/chart");

var createSeries = function(options, renderSettings) {
    renderSettings = renderSettings || {};
    var renderer = renderSettings.renderer = renderSettings.renderer || new vizMocks.Renderer();

    options = $.extend(true, {
        containerBackgroundColor: "containerColor",
        argumentField: "arg",
        valueField: "val",
        label: {
            visible: true,
            border: {},
            connector: {},
            font: {}
        },
        type: "pie",
        border: {
            visible: true
        },
        visible: true,
        point: {
            hoverStyle: {},
            selectionStyle: {}
        },
        mainSeriesColor: sinon.stub().returnsArg(0),
        valueErrorBar: {},
        hoverStyle: { hatching: "h-hatching" },
        selectionStyle: { hatching: "s-hatching" },
        hoverMode: "excludePoints",
        selectionMode: "excludePoints",
        widgetType: "pie"
    }, options);

    renderSettings = $.extend({
        labelsGroup: renderer.g(),
        seriesGroup: renderer.g()
    }, renderSettings);

    renderer.stub("g").reset();
    return new Series(renderSettings, options);
};
var createPoint = function(series, data) {
    var stub = sinon.createStubInstance(pointModule.Point);
    stub.argument = 1;
    stub.hasValue.returns(true);
    stub.isInVisibleArea.returns(true);
    stub.coordsIn.resetBehavior();
    stub._label = sinon.createStubInstance(labelModule.Label);
    return stub;
};

function resetStub(stub) {
    $.each(stub, function(_, stubFunc) {
        stubFunc && stubFunc.reset && stubFunc.reset();
    });
}

var mockPoints = [createPoint(), createPoint(), createPoint(), createPoint(), createPoint(), createPoint()];
var environment = {
        beforeEach: function() {
            insertMockFactory();
            this.renderer = new vizMocks.Renderer();
            this.seriesGroup = this.renderer.g();
            this.data = [{ arg: 1, val: 10 }, { arg: 2, val: 20 }, { arg: 3, val: 30 }, { arg: 4, val: 40 }];
            this.translator = new MockTranslator({
                translateX: { "First": 10, "Second": 20, "Third": 30, "Fourth": 40, "canvas_position_default": "defaultX" },
                translateY: { 1: 100, 2: 200, 3: 300, 4: 400, "canvas_position_default": "defaultY" },
                getCanvasVisibleArea: { minX: 0, maxX: 700, minY: 0, maxY: 500 }
            });
        },
        afterEach: function() {

        }
    },

    environmentWithSinonStubPoint = {
        beforeEach: function() {
            environment.beforeEach.call(this);
            var mockPointIndex = 0;
            this.createPoint = sinon.stub(pointModule, "Point", function(series, data) {
                var stub = mockPoints[mockPointIndex++];

                stub.argument = data.argument || 1;
                stub.value = data.value || 1;
                stub.isVisible.returns(true);
                stub.series = series;
                stub.hasValue.returns(true);
                stub._label.getBoundingRect.returns({ x: 1, y: 2, width: 20, height: 10 });
                stub._label.isVisible.returns("hidden");
                stub._label.getLayoutOptions.returns({ position: "outside" });
                stub.isInVisibleArea.returns(true);
                resetStub(stub);
                stub.isSelected.returns(false);
                resetStub(stub._label);
                return stub;
            });
        },
        afterEach: function() {
            pointModule.Point.restore();
        }
    };

function checkMainSeriesColor(assert, series, i, arg, index) {
    assert.equal(series.getOptions().mainSeriesColor.getCall(i).args[0], arg);
    assert.equal(series.getOptions().mainSeriesColor.getCall(i).args[1], index);
}

var checkTwoGroups = function(assert, series) {
    var parentGroup = series._group,
        renderer = series._renderer,
        labelsGroup = series._extGroups.labelsGroup;
    assert.ok(parentGroup, "series created without group");

    assert.equal(renderer.stub("g").callCount, 3);
    assert.equal(renderer.stub("g").getCall(0).returnValue.stub("attr").firstCall.args[0]["class"], "dxc-series");
    assert.equal(renderer.stub("g").getCall(1).returnValue.stub("attr").firstCall.args[0]["class"], "dxc-markers");
    assert.equal(renderer.stub("g").getCall(2).returnValue.stub("attr").firstCall.args[0]["class"], "dxc-labels");

    assert.equal(series._markersGroup.stub("append").lastCall.args[0], parentGroup);
    assert.equal(series._labelsGroup.stub("append").lastCall.args[0], labelsGroup);
};

(function Pie() {

    QUnit.module("Pie series. Draw", environmentWithSinonStubPoint);

    var checkGroups = checkTwoGroups,
        seriesType = "pie";

    QUnit.test("Draw doughnut", function(assert) {
        var series = createSeries({
            type: "doughnut",
            point: { visible: false }

        }, { renderer: this.renderer });
        //act
        series.draw(this.translator, false);
        //assert

        checkGroups(assert, series);

    });

    QUnit.test("Draw donut", function(assert) {
        var series = createSeries({
            type: "donut",
            point: { visible: false }

        }, { renderer: this.renderer });
        //act
        series.draw(this.translator, false);
        //assert

        checkGroups(assert, series);

    });

    QUnit.test("Draw without data", function(assert) {
        var series = createSeries({
            type: seriesType,
            point: { visible: false }

        }, { renderer: this.renderer });
        //act
        series.draw(this.translator, false);
        //assert

        checkGroups(assert, series);

    });

    QUnit.test("Update to empty data", function(assert) {
        var series = createSeries({
            type: seriesType,
            point: { visible: false }

        }, { renderer: this.renderer });
        //act
        series.updateData(this.data);
        series.draw(this.translator, false);
        series.updateData([]);
        //assert

        assert.equal(series._points.length, 0);
        assert.equal(series._originalPoints.length, 0);
    });

    //T102876
    QUnit.test("paintNullPoints is false & undefined value field", function(assert) {
        var series = createSeries({
            type: seriesType,
            paintNullPoints: false
        }, { renderer: this.renderer });
        series.updateData([{ arg: 1, val: 1 }, { arg: 2, val: undefined }]);

        //assert
        assert.equal(series.getPoints().length, 1);
    });

    QUnit.test("paintNullPoints is false & null value field", function(assert) {
        var series = createSeries({
            type: seriesType,
            paintNullPoints: false
        }, { renderer: this.renderer });
        series.updateData([{ arg: 1, val: 1 }, { arg: 2, val: null }]);

        //assert
        assert.equal(series.getPoints().length, 1);
    });

    QUnit.test("paintNullPoints is true & null value field", function(assert) {
        var series = createSeries({
            type: seriesType,
            paintNullPoints: true
        }, { renderer: this.renderer });
        series.updateData([{ arg: 1, val: 1 }, { arg: 2, val: null }]);

        //assert
        assert.equal(series.getPoints().length, 2);
    });

    QUnit.test("paintNullPoints is true & undefined value field", function(assert) {
        var series = createSeries({
            type: seriesType,
            paintNullPoints: true
        }, { renderer: this.renderer });
        series.updateData([{ arg: 1, val: 1 }, { arg: 2, val: undefined }]);

        //assert
        assert.equal(series.getPoints().length, 1);
    });

    QUnit.test("Draw simple data without animation", function(assert) {
        var series = createSeries({
            type: seriesType,
            point: { visible: false },
            label: { visible: false }

        }, { renderer: this.renderer });

        series.updateData(this.data);
        $.each(series._points, function(i, pt) {
            pt._label.isVisible.returns(false);
            pt.x = pt.argument;
            pt.y = pt.value;
        });
        //act
        series.draw(this.translator, false);
        //assert
        checkGroups(assert, series);

        $.each(series._points, function(i, p) {
            assert.equal(p.animate.callCount, 0, i + " point draw without animate");
            assert.strictEqual(p.draw.callCount, 1);
            assert.strictEqual(p.draw.lastCall.args[0], series._renderer, "renderer passed to point");
            assert.strictEqual(p.draw.lastCall.args[1].markers, series._markersGroup, "markers group passed to point");
            assert.strictEqual(p.draw.lastCall.args[2], false);
            assert.strictEqual(p.draw.lastCall.args[3], true);
        });
    });

    QUnit.test("Animation series. First drawing", function(assert) {
        var options = {
                point: { visible: false },
                label: { visible: false }
            },
            complete,
            points,
            series = createSeries($.extend({ type: seriesType }, options), { renderer: this.renderer, trackerGroup: {} });
        series.updateData(this.data.slice(0, 3));

        series.draw(this.translator, true);

        //assert
        function assertAnimationArguments(point, duration, delay, completeShouldBePassed) {
            assert.strictEqual(point.animate.callCount, 1, "animate called");
            if(completeShouldBePassed) {
                assert.ok(point.animate.lastCall.args[0], "complete");
            } else {
                assert.strictEqual(point.animate.lastCall.args[0], undefined, "complete");
            }

            assert.strictEqual(point.animate.lastCall.args[1].toFixed(2), duration.toFixed(2), "duration");
            assert.strictEqual(point.animate.lastCall.args[2].toFixed(2), delay.toFixed(2), "delay");
        }

        points = series.getAllPoints();

        assertAnimationArguments(points[0], 0.7, 0, false);
        assertAnimationArguments(points[1], 0.7, 0.15, false);
        assertAnimationArguments(points[2], 0.7, 0.3, true);

        complete = points[2].animate.lastCall.args[0];

        complete();
        assert.deepEqual(series._labelsGroup.stub("animate").lastCall.args[0], { opacity: 1 });
        assert.deepEqual(series._labelsGroup.stub("animate").lastCall.args[1], { duration: 400 });
    });

    QUnit.test("First drawing after empty dataSource", function(assert) {
        var options = {
            type: "pie",
            color: "red",
            point: { visible: false },
            label: { visible: false }
        };
        this.data = this.data.slice(0, 2);

        var series = createSeries(options, { trackerGroup: {} });
        series.updateData(this.data);
        series.translators = this.translators;
        series.canvas = { width: 400, height: 400, left: 0, right: 0, top: 0, bottom: 0 };


        series.draw(this.renderer, this.seriesGroup);
        series.updateData([]);
        series.draw(this.renderer, this.seriesGroup);
        series.updateData(this.data);
        //act
        series.draw(this.renderer, this.seriesGroup);

        //assert
        $.each(series.getPoints(), function(i, p) {
            assert.strictEqual(p.draw.getCall(0).args[3], true, "firstDrawing flag on first call");
        });
    });

    QUnit.test("Animation series. Second drawing", function(assert) {
        var options = {
                point: { visible: false },
                label: { visible: false }
            },
            complete,
            series = createSeries($.extend({ type: seriesType }, options), { renderer: this.renderer, trackerGroup: {} });
        series.updateData(this.data);

        series.draw(this.translator, true);
        $.each(series.getPoints(), function(_, p) {
            p.animate.reset();
            p.draw.reset();
        });
        //Act
        series.draw(this.translator, true);

        //assert
        $.each(series.getPoints(), function(i, p) {
            assert.ok(p.draw.calledOnce);
            assert.strictEqual(p.draw.lastCall.args[0], series._renderer, "renderer passed to point");
            assert.strictEqual(p.draw.lastCall.args[1].markers, series._markersGroup, "markers group passed to point");
            assert.strictEqual(p.draw.lastCall.args[2], true);
            assert.strictEqual(p.draw.lastCall.args[3], false);
            assert.equal(p.animate.callCount, 1, i + " point draw with animate");
            assert.equal(p.animate.firstCall.args.length, 1, "call with params");
            if(i !== series._points.length - 1) {
                assert.equal(p.animate.firstCall.args[0], undefined);
            } else {
                complete = p.animate.firstCall.args[0];
                assert.ok(complete, "complete function");
            }
        });

        complete();
        assert.deepEqual(series._labelsGroup.stub("animate").lastCall.args[0], { opacity: 1 });
        assert.deepEqual(series._labelsGroup.stub("animate").lastCall.args[1], { duration: 400 });
    });

    QUnit.test("no selected points. legendCallback not called", function(assert) {
        var series = createSeries({
                type: seriesType,
                point: {
                    visible: true
                }
            }),
            legendCallback = sinon.spy();

        series.updateData(this.data);
        series.draw(this.translator, false, undefined, legendCallback);

        assert.equal(legendCallback.callCount, 0);
    });

    QUnit.test("several selected points. legendCallback is called", function(assert) {
        var series = createSeries({
                type: seriesType,
                point: {
                    visible: true
                }
            }),
            legendCallback = sinon.spy(function() {
                return sinon.spy();
            });

        series.updateData(this.data);
        this.createPoint.returnValues[1].isSelected.returns(true);
        this.createPoint.returnValues[2].isSelected.returns(true);
        series.draw(this.translator, false, undefined, legendCallback);

        assert.equal(legendCallback.callCount, 2);
    });

    QUnit.module("Pie. Points animation", {
        beforeEach: function() {
            environmentWithSinonStubPoint.beforeEach.call(this);

            this.series = createSeries({
                type: seriesType,
                point: { visible: true },
                label: { visible: false }
            }, { renderer: this.renderer });
            this.series.updateData(this.data);
        },
        afterEach: environmentWithSinonStubPoint.afterEach
    });

    QUnit.test("Draw without animation", function(assert) {
        var series = this.series;
        $.each(series._points, function(_, pt) {
            pt._label.isVisible.returns(false);
        });
        //act
        series.draw(this.translator, false);
        //assert
        $.each(series._points, function(i, p) {
            assert.ok(p.draw.calledOnce);
            assert.equal(p.draw.firstCall.args[0], series._renderer, "renderer pass to point " + i);
            assert.equal(p.draw.firstCall.args[1].markers, series._markersGroup, "markers group pass to point " + i);
            assert.equal(p.draw.firstCall.args[2], false, "animation should be disabled " + i);
        });
    });

    QUnit.test("Draw with animation", function(assert) {
        var series = this.series;
        //act
        $.each(series._points, function(_, pt) {
            pt._label.isVisible.returns(false);
        });
        series.draw(this.translator, true);
        //assert
        $.each(series._points, function(i, p) {
            assert.ok(p.draw.calledOnce);
            assert.equal(p.draw.firstCall.args[0], series._renderer, "renderer pass to point " + i);
            assert.equal(p.draw.firstCall.args[1].markers, series._markersGroup, "markers group pass to point " + i);
            assert.equal(p.draw.firstCall.args[2], true, "animation should be enabled " + i);
        });
    });

    QUnit.test("Draw when some points is invisible", function(assert) {
        var series = this.series;
        //act
        $.each(series._points, function(_, pt) {
            pt._label.isVisible.returns(false);
        });

        series._points[0].isVisible.returns(false);
        series._points[2].isVisible.returns(false);

        series.draw(this.translator, true);
        //assert
        $.each(series._points, function(i, p) {
            assert.ok(p.draw.calledOnce);
            assert.equal(p.draw.firstCall.args[0], series._renderer, "renderer pass to point " + i);
            assert.equal(p.draw.firstCall.args[1].markers, series._markersGroup, "markers group pass to point " + i);
            assert.equal(p.draw.firstCall.args[2], true, "animation should be enabled " + i);
            if(p === series._points[0] || p === series._points[2]) {
                assert.ok(p.setInvisibility.calledOnce);
                assert.ok(p.setInvisibility.calledAfter(p.draw));
            } else {
                assert.ok(!p.setInvisibility.called);
            }

        });


    });

    QUnit.module("Pie. Point styles", {
        beforeEach: function() {
            environmentWithSinonStubPoint.beforeEach.call(this);
            this.data = [{ arg: "arg1", val: "val1", tag: "tag1" }, { arg: "arg2", val: "val2", tag: "tag2" }];
            this.options = {
                type: seriesType,
                color: "n-color",
                border: {
                    visible: true,
                    color: "n-b-color",
                    width: "n-b-width",
                    dashStyle: "n-b-dashStyle"
                },
                hoverStyle: {
                    color: "h-color",
                    border: {
                        visible: true,
                        color: "h-b-color",
                        width: "h-b-width",
                        dashStyle: "h-b-dashStyle"
                    }
                },
                selectionStyle: {
                    color: "s-color",
                    border: {
                        visible: true,
                        color: "s-b-color",
                        width: "s-b-width",
                        dashStyle: "s-b-dashStyle"
                    }
                }
            };
        },
        afterEach: environmentWithSinonStubPoint.afterEach
    });

    QUnit.test("style in point", function(assert) {
        var series = createSeries(this.options);

        series.updateData(this.data);

        assert.deepEqual(this.createPoint.firstCall.args[2].styles, {
            hover: {
                fill: "h-color",
                stroke: "h-b-color",
                "stroke-width": "h-b-width",
                dashStyle: "h-b-dashStyle",
                hatching: "h-hatching"
            },
            normal: {
                fill: "n-color",
                stroke: "n-b-color",
                "stroke-width": "n-b-width",
                dashStyle: "n-b-dashStyle",
                hatching: undefined
            },
            selection: {
                fill: "s-color",
                stroke: "s-b-color",
                "stroke-width": "s-b-width",
                dashStyle: "s-b-dashStyle",
                hatching: "s-hatching"
            },
            legendStyles: {
                "hover": {
                    "fill": "h-color",
                    hatching: "h-hatching"
                },
                "normal": {
                    "fill": "n-color",
                    hatching: undefined
                },
                "selection": {
                    "fill": "s-color",
                    hatching: "s-hatching"
                }
            }
        });
    });

    QUnit.test("style in point group", function(assert) {
        var series = createSeries(this.options);

        series.updateData(this.data);
        $.each(series._points, function(_, pt) {
            pt._label.isVisible.returns(false);
        });
        series.draw(this.translator, false);

        assert.strictEqual(series._markersGroup._stored_settings.fill, undefined);
        assert.strictEqual(series._markersGroup._stored_settings.stroke, undefined);
        assert.strictEqual(series._markersGroup._stored_settings["stroke-width"], undefined);
    });

    QUnit.test("All options defined", function(assert) {
        var series = createSeries(this.options),
            styles;

        series.updateData(this.data);
        styles = series._getPointOptions().styles;

        assert.deepEqual(styles.hover, {
            fill: "h-color",
            stroke: "h-b-color",
            "stroke-width": "h-b-width",
            dashStyle: "h-b-dashStyle",
            hatching: "h-hatching"
        }, "hover styles");

        assert.deepEqual(styles.normal, {
            fill: "n-color",
            stroke: "n-b-color",
            "stroke-width": "n-b-width",
            dashStyle: "n-b-dashStyle",
            hatching: undefined
        }, "normal styles");

        assert.deepEqual(styles.selection, {
            fill: "s-color",
            stroke: "s-b-color",
            "stroke-width": "s-b-width",
            dashStyle: "s-b-dashStyle",
            hatching: "s-hatching"
        }, "selection styles");
    });

    QUnit.test("mainSeriesColor", function(assert) {
        var series = createSeries();
        series.updateData([{ arg: "arg1", val: "val1" },
            { arg: "arg2", val: "val2" },
            { arg: "arg3", val: "val3" },
            { arg: "arg2", val: "val4" },
            { arg: "arg2", val: "val5" },
            { arg: "arg3", val: "val6" }]);

        assert.equal(series.getOptions().mainSeriesColor.callCount, 6);

        checkMainSeriesColor(assert, series, 0, "arg1", 0);
        checkMainSeriesColor(assert, series, 1, "arg2", 0);
        checkMainSeriesColor(assert, series, 2, "arg3", 0);
        checkMainSeriesColor(assert, series, 3, "arg2", 1);
        checkMainSeriesColor(assert, series, 4, "arg2", 2);
        checkMainSeriesColor(assert, series, 5, "arg3", 1);
    });

    QUnit.test("mainSeriesColor, update", function(assert) {
        var series = createSeries(),
            data = [{ arg: "arg1", val: "val1" },
            { arg: "arg2", val: "val2" },
            { arg: "arg3", val: "val3" },
            { arg: "arg2", val: "val4" },
            { arg: "arg2", val: "val5" },
            { arg: "arg3", val: "val6" }];
        series.updateData(data);
        series.getOptions().mainSeriesColor.reset();
        series.updateData(data);

        assert.equal(series.getOptions().mainSeriesColor.callCount, 6);

        checkMainSeriesColor(assert, series, 0, "arg1", 0);
        checkMainSeriesColor(assert, series, 1, "arg2", 0);
        checkMainSeriesColor(assert, series, 2, "arg3", 0);
        checkMainSeriesColor(assert, series, 3, "arg2", 1);
        checkMainSeriesColor(assert, series, 4, "arg2", 2);
        checkMainSeriesColor(assert, series, 5, "arg3", 1);
    });

    QUnit.test("without borders", function(assert) {
        this.options.border.visible = false;
        this.options.hoverStyle.border.visible = false;
        this.options.selectionStyle.border.visible = false;
        var series = createSeries(this.options),
            styles;

        series.updateData(this.data);
        styles = series._getPointOptions().styles;

        assert.strictEqual(styles.hover["stroke-width"], 0);
        assert.strictEqual(styles.normal["stroke-width"], 0);
        assert.strictEqual(styles.selection["stroke-width"], 0);
    });

    QUnit.test("Define only series color", function(assert) {
        var series = createSeries({
                type: seriesType,
                border: {
                    visible: true
                },
                hoverStyle: {
                    border: {
                        visible: true
                    }
                },
                selectionStyle: {
                    border: {
                        visible: true
                    }
                }
            }),
            styles;
        series.updateData(this.data);
        styles = series._getPointOptions({ argument: "arg" }).styles;

        assert.strictEqual(styles.hover.fill, "arg", "hover.fill");
        assert.strictEqual(styles.hover.stroke, "arg", "hover.stroke");

        assert.strictEqual(styles.normal.fill, "arg", "normal.fill");
        assert.strictEqual(styles.normal.stroke, "arg", "normal.stroke");

        assert.strictEqual(styles.selection.fill, "arg", "selection.fill");
        assert.strictEqual(styles.selection.stroke, "arg", "selection.stroke");

        assert.strictEqual(styles.legendStyles.hover.fill, "arg", "legend hover.fill");
        assert.strictEqual(styles.legendStyles.normal.fill, "arg", "legend normal.fill");
        assert.strictEqual(styles.legendStyles.selection.fill, "arg", "legend selection.fill");
    });

    QUnit.test("data with null points. Define only series color", function(assert) {
        this.data[0].val = null;
        var series = createSeries({
                type: seriesType,
                border: {
                    visible: true
                },
                hoverStyle: {
                    border: {
                        visible: true
                    }
                },
                selectionStyle: {
                    border: {
                        visible: true
                    }
                }
            }),
            styles;
        series.updateData(this.data);

        assert.ok(this.createPoint.calledOnce);

        styles = this.createPoint.getCall(0).args[2].styles;

        assert.strictEqual(styles.hover.fill, "arg2", "hover.fill");
        assert.strictEqual(styles.hover.stroke, "arg2", "hover.stroke");

        assert.strictEqual(styles.normal.fill, "arg2", "normal.fill");
        assert.strictEqual(styles.normal.stroke, "arg2", "normal.stroke");

        assert.strictEqual(styles.selection.fill, "arg2", "selection.fill");
        assert.strictEqual(styles.selection.stroke, "arg2", "selection.stroke");
    });

    QUnit.test("data with null points. Define only series color. paintNullPoints", function(assert) {
        this.data[0].val = null;
        var series = createSeries({
                type: seriesType,
                paintNullPoints: true,
                border: {
                    visible: true
                },
                hoverStyle: {
                    border: {
                        visible: true
                    }
                },
                selectionStyle: {
                    border: {
                        visible: true
                    }
                }
            }),
            styles;
        series.updateData(this.data);

        assert.equal(this.createPoint.callCount, 2);

        styles = this.createPoint.getCall(0).args[2].styles;

        assert.strictEqual(styles.hover.fill, "arg1", "hover.fill");
        assert.strictEqual(styles.hover.stroke, "arg1", "hover.stroke");

        assert.strictEqual(styles.normal.fill, "arg1", "normal.fill");
        assert.strictEqual(styles.normal.stroke, "arg1", "normal.stroke");

        assert.strictEqual(styles.selection.fill, "arg1", "selection.fill");
        assert.strictEqual(styles.selection.stroke, "arg1", "selection.stroke");

        styles = this.createPoint.getCall(1).args[2].styles;

        assert.strictEqual(styles.hover.fill, "arg2", "hover.fill");
        assert.strictEqual(styles.hover.stroke, "arg2", "hover.stroke");

        assert.strictEqual(styles.normal.fill, "arg2", "normal.fill");
        assert.strictEqual(styles.normal.stroke, "arg2", "normal.stroke");

        assert.strictEqual(styles.selection.fill, "arg2", "selection.fill");
        assert.strictEqual(styles.selection.stroke, "arg2", "selection.stroke");
    });

    QUnit.module("Pie. Arrange Points", environment, {
        beforeEach: function() {
            this.renderer = new vizMocks.Renderer();
            this.data = [
                { arg: 1, val: 100 },
                { arg: 2, val: 200 },
                { arg: 3, val: 300 },
                { arg: 4, val: 400 }
            ];
            insertMockFactory();
        }
    });

    QUnit.test("All defaults", function(assert) {
        //arrange
        var data = [
                { arg: 1, val: 100 },
                { arg: 2, val: 200 },
                { arg: 3, val: 300 },
                { arg: 4, val: 400 }
            ],
            series = createSeries({
                type: seriesType,
                label: { visible: false }
            }, { renderer: this.renderer });

        series.updateData(data);

        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 4, "Every point should be corrected");
        assert.strictEqual(points[0].value, data[0].val);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, data[0].val + data[1].val);
        assert.strictEqual(points[1].minValue, data[0].val);
        assert.strictEqual(points[2].value, data[0].val + data[1].val + data[2].val);
        assert.strictEqual(points[2].minValue, data[0].val + data[1].val);
        assert.strictEqual(points[3].value, data[0].val + data[1].val + data[2].val + data[3].val);
        assert.strictEqual(points[3].minValue, data[0].val + data[1].val + data[2].val);
        assert.equal(series.getRangeData().val.max, points[3].value);
    });

    QUnit.test("All negative", function(assert) {
        //arrange
        var data = [
                { arg: 1, val: -100 },
                { arg: 2, val: -200 },
                { arg: 3, val: -300 },
                { arg: 4, val: -400 }
            ],
            series = createSeries({
                type: seriesType,
                label: { visible: false }
            }, { renderer: this.renderer });

        series.updateData(data);

        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 4, "Every point should be corrected");
        assert.strictEqual(points[0].value, data[0].val);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, data[0].val + data[1].val);
        assert.strictEqual(points[1].minValue, data[0].val);
        assert.strictEqual(points[2].value, data[0].val + data[1].val + data[2].val);
        assert.strictEqual(points[2].minValue, data[0].val + data[1].val);
        assert.strictEqual(points[3].value, data[0].val + data[1].val + data[2].val + data[3].val);
        assert.strictEqual(points[3].minValue, data[0].val + data[1].val + data[2].val);
        assert.equal(series.getRangeData().val.max, points[3].value);
    });

    QUnit.test("All defaults. double arrange points with passed points", function(assert) {
        //arrange
        var data = [
                { arg: 1, val: 100 },
                { arg: 2, val: 200 },
                { arg: 3, val: 300 },
                { arg: 4, val: 400 }
            ],
            series = createSeries({
                type: seriesType,
                label: { visible: false }
            }, { renderer: this.renderer });

        series.updateData(data);
        series.arrangePoints();
        //act
        series.arrangePoints(series._points);
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 4, "Every point should be corrected");
        assert.strictEqual(points[0].value, data[0].val);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, data[0].val + data[1].val);
        assert.strictEqual(points[1].minValue, data[0].val);
        assert.strictEqual(points[2].value, data[0].val + data[1].val + data[2].val);
        assert.strictEqual(points[2].minValue, data[0].val + data[1].val);
        assert.strictEqual(points[3].value, data[0].val + data[1].val + data[2].val + data[3].val);
        assert.strictEqual(points[3].minValue, data[0].val + data[1].val + data[2].val);
    });

    QUnit.test("All defaults. arrange after point visibility changed", function(assert) {
        //arrange
        var data = [
                { arg: 1, val: 100 },
                { arg: 2, val: 200 },
                { arg: 3, val: 300 },
                { arg: 4, val: 400 }
            ],
            series = createSeries({
                type: seriesType,
                label: { visible: false }
            }, { renderer: this.renderer }),
            points;

        series.updateData(data);
        points = series.getPoints();
        series.arrangePoints();

        points[2].isVisible = function() {
            return false;
        };
        //act
        series.arrangePoints(series.getVisiblePoints());
        //assert
        assert.strictEqual(points[2].value, data[0].val + data[1].val + data[2].val);
        assert.strictEqual(points[2].minValue, data[0].val + data[1].val);

        assert.strictEqual(points.length, 4, "Every point should be corrected");
        assert.strictEqual(points[0].value, data[0].val);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, data[0].val + data[1].val);
        assert.strictEqual(points[1].minValue, data[0].val);
        assert.strictEqual(points[3].value, data[0].val + data[1].val + data[3].val);
        assert.strictEqual(points[3].minValue, data[0].val + data[1].val);

        assert.deepEqual(series.getRangeData(), { val: { min: 0, max: points[3].value } });
    });

    QUnit.test("Draw zero points", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 10 },
                { arg: 2, val: 20 },
                { arg: 3, val: 0 },
                { arg: 4, val: 20 },
                { arg: 5, val: 40 }],
            series = createSeries({ type: seriesType, minSegmentSize: 2 }, { renderer: this.renderer });
        var minShownValue = 180 / 358;
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.ok(points);
        assert.strictEqual(points.length, 5);
        assert.strictEqual(points[0].value, data[0].val);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, data[0].val + data[1].val);
        assert.strictEqual(points[1].minValue, data[0].val);
        assert.strictEqual(points[2].value, data[0].val + data[1].val + minShownValue);
        assert.strictEqual(points[2].minValue, data[0].val + data[1].val);
        assert.strictEqual(points[3].value, data[0].val + data[1].val + data[3].val + minShownValue);
        assert.strictEqual(points[3].minValue, data[0].val + data[1].val + minShownValue);
        assert.equal(points[4].value, data[0].val + data[1].val + data[3].val + data[4].val + minShownValue);
        assert.strictEqual(points[4].minValue, data[0].val + data[1].val + data[3].val + minShownValue);

        assert.equal(series.getRangeData().val.max, points[4].value);
    });

    QUnit.test("Dispose series arrange zero points", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 10 },
                { arg: 2, val: 20 },
                { arg: 3, val: 0 },
                { arg: 4, val: 20 },
                { arg: 5, val: 40 }],
            series = createSeries({ type: seriesType }, { renderer: this.renderer });
        series.updateData(data);

        var points = series.getPoints();

        $.each(points, function(_, p) {
            sinon.spy(p, "dispose");
        });

        series.arrangePoints();

        //act
        series.dispose();
        //assert

        $.each(points, function(i, p) {
            assert.equal(p.dispose.callCount, 1, i + "-th point");
        });
    });

    QUnit.test("Draw zero points when point invisible", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 10 },
                { arg: 2, val: 20 },
                { arg: 3, val: 0 },
                { arg: 4, val: 20 },
                { arg: 5, val: 40 }],
            series = createSeries({ type: seriesType, minSegmentSize: 2 }, { renderer: this.renderer });
        var minShownValue = 140 / 358;
        series.updateData(data);
        series._points[1].isVisible = function() {
            return false;
        };
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.ok(points);
        assert.strictEqual(points.length, 5);
        assert.strictEqual(points[0].value, data[0].val);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[2].value, data[0].val + minShownValue);
        assert.strictEqual(points[2].minValue, data[0].val);
        assert.strictEqual(points[3].value, data[0].val + data[3].val + minShownValue);
        assert.strictEqual(points[3].minValue, data[0].val + minShownValue);
        assert.equal(points[4].value, data[0].val + data[3].val + data[4].val + minShownValue);
        assert.strictEqual(points[4].minValue, data[0].val + data[3].val + minShownValue);

        assert.equal(series.getRangeData().val.max, points[4].value);
    });

    QUnit.test("One point with value and hidden, other points with zero value", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 1 },
                { arg: 2, val: 0 },
                { arg: 3, val: 0 },
                { arg: 4, val: 0 },
                { arg: 5, val: 0 }],
            series = createSeries({ type: seriesType }, { renderer: this.renderer });
        series.updateData(data);
        series._points[0].isVisible = function() { return false; };

        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 5);
        assert.strictEqual(points[0].value, 1);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, 1);
        assert.strictEqual(points[1].minValue, 0);
        assert.strictEqual(points[2].value, 2);
        assert.strictEqual(points[2].minValue, 1);
        assert.strictEqual(points[3].value, 3);
        assert.strictEqual(points[3].minValue, 2);
        assert.strictEqual(points[4].value, 4);
        assert.strictEqual(points[4].minValue, 3);
    });

    QUnit.test("All points with zero value", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 0 },
                { arg: 2, val: 0 },
                { arg: 3, val: 0 },
                { arg: 4, val: 0 },
                { arg: 5, val: 0 }],
            series = createSeries({ type: seriesType }, { renderer: this.renderer });
        series.updateData(data);

        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.ok(points);
        assert.strictEqual(points.length, 5, "All points should be showed");
    });

    QUnit.test("All points with zero value, minSegmentSize is specify", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 0 },
                { arg: 2, val: 0 },
                { arg: 3, val: 0 },
                { arg: 4, val: 0 },
                { arg: 5, val: 0 }],
            series = createSeries({ type: seriesType, minSegmentSize: 1 }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints(series.getPoints());
        //assert
        var points = series.getPoints();
        assert.ok(points);
        assert.strictEqual(points.length, 5);
        assert.strictEqual(points[0].value, 1);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, 2);
        assert.strictEqual(points[1].minValue, 1);
        assert.strictEqual(points[2].value, 3);
        assert.strictEqual(points[2].minValue, 2);
        assert.strictEqual(points[3].value, 4);
        assert.strictEqual(points[3].minValue, 3);
        assert.strictEqual(points[4].value, 5);
        assert.strictEqual(points[4].minValue, 4);
        assert.equal(series.getRangeData().val.max, points[4].value);
    });

    QUnit.test("All points with zero value, minSegmentSize is specify. Double arrange point", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 0 },
                { arg: 2, val: 0 },
                { arg: 3, val: 0 },
                { arg: 4, val: 0 },
                { arg: 5, val: 0 }],
            series = createSeries({ type: seriesType, minSegmentSize: 1 }, { renderer: this.renderer });
        series.updateData(data);
        series.arrangePoints();
        //act
        series.arrangePoints(series.getPoints());
        //assert
        var points = series.getPoints();
        assert.ok(points);
        assert.strictEqual(points.length, 5);
        assert.strictEqual(points[0].value, 1);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, 2);
        assert.strictEqual(points[1].minValue, 1);
        assert.strictEqual(points[2].value, 3);
        assert.strictEqual(points[2].minValue, 2);
        assert.strictEqual(points[3].value, 4);
        assert.strictEqual(points[3].minValue, 3);
        assert.strictEqual(points[4].value, 5);
        assert.strictEqual(points[4].minValue, 4);
        assert.equal(series.getRangeData().val.max, points[4].value);
    });

    QUnit.test("minSegmentSize more than 360", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 300 },
                    { arg: 2, val: 400 },
                    { arg: 3, val: 3 },
                    { arg: 4, val: 500 },
                    { arg: 5, val: 200 }],

            series = createSeries({ type: seriesType, minSegmentSize: 400 }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.ok(points);
        assert.strictEqual(points.length, 5);
        assert.strictEqual(points[0].value, 300);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, 700);
        assert.strictEqual(points[1].minValue, 300);
        assert.strictEqual(points[2].value, 703);
        assert.strictEqual(points[2].minValue, 700);
        assert.strictEqual(points[3].value, 1203);
        assert.strictEqual(points[3].minValue, 703);
        assert.strictEqual(points[4].value, 1403);
        assert.strictEqual(points[4].minValue, 1203);
        assert.equal(series.getRangeData().val.max, points[4].value);
    });

    QUnit.test("minSegmentSize less than 360", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 300 },
                    { arg: 2, val: 400 },
                    { arg: 3, val: 3 },
                    { arg: 4, val: 500 },
                    { arg: 5, val: 200 }],
            series = createSeries({ type: seriesType, minSegmentSize: 30 }, { renderer: this.renderer });

        var minShownValue = 30 * 1400 / 330;
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.ok(points);
        assert.strictEqual(points.length, 5);
        assert.strictEqual(points[0].value, data[0].val);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, data[0].val + data[1].val);
        assert.strictEqual(points[1].minValue, data[0].val);
        assert.strictEqual(points[2].value, data[0].val + data[1].val + minShownValue);
        assert.strictEqual(points[2].minValue, data[0].val + data[1].val);
        assert.strictEqual(points[3].value, data[0].val + data[1].val + data[3].val + minShownValue);
        assert.strictEqual(points[3].minValue, data[0].val + data[1].val + minShownValue);
        assert.strictEqual(points[4].value, data[0].val + data[1].val + data[3].val + data[4].val + minShownValue);
        assert.strictEqual(points[4].minValue, data[0].val + data[1].val + data[3].val + minShownValue);
    });

    QUnit.test("minSegmentSize = 360", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 300 },
                    { arg: 2, val: 4 }],
            series = createSeries({ type: seriesType, minSegmentSize: 360 }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.ok(points);
        assert.strictEqual(points.length, 2);
        assert.strictEqual(points[0].value, data[0].val);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, data[0].val + 4);
        assert.strictEqual(points[1].minValue, data[0].val);
    });

    QUnit.test("minSegmentSize = 180", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 300 },
                    { arg: 2, val: 400 },
                    { arg: 3, val: 3 }],
            series = createSeries({ type: seriesType, minSegmentSize: 180 }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.ok(points);
        assert.strictEqual(points.length, 3);
        assert.strictEqual(points[0].value, 300);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, 700);
        assert.strictEqual(points[1].minValue, 300);
        assert.strictEqual(points[2].value, 703);
        assert.strictEqual(points[2].minValue, 700);
    });

    QUnit.test("Remove negative points defaults", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 10 },
                { arg: 2, val: 20 },
                { arg: 3, val: -20 },
                { arg: 4, val: 30 },
                { arg: 5, val: 40 }],
            series = createSeries({ type: seriesType, argumentField: "arg", valueField: "val", label: {} }, { renderer: this.renderer });
        series.updateData(data);

        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.ok(points);
        assert.strictEqual(points.length, 4, "One point should be removed");

        assert.deepEqual(series.getPointsByArg(3), [], "no point with argument is -20");
        assert.strictEqual(points[0].value, data[0].val);
        assert.strictEqual(points[0].minValue, 0);
        assert.strictEqual(points[1].value, data[0].val + data[1].val);
        assert.strictEqual(points[1].minValue, data[0].val);
        assert.strictEqual(points[2].value, data[0].val + data[1].val + data[3].val);
        assert.strictEqual(points[2].minValue, data[0].val + data[1].val);
        assert.strictEqual(points[3].value, data[0].val + data[1].val + data[3].val + data[4].val);
        assert.strictEqual(points[3].minValue, data[0].val + data[1].val + data[3].val);
    });

    QUnit.test("Percents are filled", function(assert) {
        //arrange
        var data = this.data,
            series = createSeries({ type: seriesType, minSegmentSize: 400 }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 4, "Every point should be corrected");
        assert.strictEqual(points[0].percent, 0.10);
        assert.strictEqual(points[1].percent, 0.20);
        assert.strictEqual(points[2].percent, 0.30);
        assert.strictEqual(points[3].percent, 0.40);
    });

    QUnit.test("Percents are filled, one of points has zero value", function(assert) {
        //arrange
        var data = [
                { arg: 1, val: 300 },
                { arg: 2, val: 0 },
                { arg: 3, val: 300 },
                { arg: 4, val: 400 }
            ],
            series = createSeries({ type: seriesType, minSegmentSize: 1 }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 4, "Every point should be corrected");
        assert.strictEqual(points[0].percent, 0.30);
        assert.ok(!points[1].percent);
        assert.strictEqual(points[2].percent, 0.30);
        assert.strictEqual(points[3].percent, 0.40);
    });

    QUnit.test("Percents are filled and last one is corrected to have strict equal to 100", function(assert) {
        //arrange
        var data = [{ arg: 1, val: 1 },
                { arg: 2, val: 1 },
                { arg: 3, val: 1 }],
            series = createSeries({ type: seriesType }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 3, "Every point should be corrected");
        assert.roughEqual(points[0].percent, 0.33333, 0.00001);
        assert.roughEqual(points[1].percent, 0.33333, 0.00001);
        assert.roughEqual(points[2].percent, 0.33333, 0.00001);
    });

    QUnit.test("Direction of segments is anticlockwise", function(assert) {
        //arrange
        var data = this.data,
            series = createSeries({ type: seriesType, segmentsDirection: "anticlockwise" }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 4, "Every point should be corrected");
        assert.strictEqual(points[0].value, data[3].val + data[2].val + data[1].val + data[0].val);
        assert.strictEqual(points[0].minValue, data[3].val + data[2].val + data[1].val);
        assert.strictEqual(points[1].value, data[3].val + data[2].val + data[1].val);
        assert.strictEqual(points[1].minValue, data[3].val + data[2].val);
        assert.strictEqual(points[2].value, data[3].val + data[2].val);
        assert.strictEqual(points[2].minValue, data[3].val);
        assert.strictEqual(points[3].value, data[3].val);
        assert.strictEqual(points[3].minValue, 0);
    });

    QUnit.test("startAngle is defined", function(assert) {
        //arrange
        var data = this.data,
            series = createSeries({ type: seriesType, startAngle: 90 }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 4);
        assert.strictEqual(points[0].shiftedAngle, 90);
        assert.strictEqual(points[1].shiftedAngle, 90);
        assert.strictEqual(points[2].shiftedAngle, 90);
        assert.strictEqual(points[3].shiftedAngle, 90);
    });

    QUnit.test("startAngle is not defined", function(assert) {
        //arrange
        var data = this.data,
            series = createSeries({ type: seriesType }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 4);
        assert.strictEqual(points[0].shiftedAngle, 0);
        assert.strictEqual(points[1].shiftedAngle, 0);
        assert.strictEqual(points[2].shiftedAngle, 0);
        assert.strictEqual(points[3].shiftedAngle, 0);
    });

    QUnit.test("startAngle is negative value", function(assert) {
        //arrange
        var data = this.data,
            series = createSeries({ type: seriesType, startAngle: -90 }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 4);
        assert.strictEqual(points[0].shiftedAngle, 270);
        assert.strictEqual(points[1].shiftedAngle, 270);
        assert.strictEqual(points[2].shiftedAngle, 270);
        assert.strictEqual(points[3].shiftedAngle, 270);
    });

    QUnit.test("startAngle is more 360", function(assert) {
        //arrange
        var data = this.data,
            series = createSeries({ type: seriesType, startAngle: 450 }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 4);
        assert.strictEqual(points[0].shiftedAngle, 90);
        assert.strictEqual(points[1].shiftedAngle, 90);
        assert.strictEqual(points[2].shiftedAngle, 90);
        assert.strictEqual(points[3].shiftedAngle, 90);
    });

    QUnit.test("startAngle is invalid value", function(assert) {
        //arrange
        var data = this.data,
            series = createSeries({ type: seriesType, startAngle: "test" }, { renderer: this.renderer });
        series.updateData(data);
        //act
        series.arrangePoints();
        //assert
        var points = series.getPoints();
        assert.strictEqual(points.length, 4);
        assert.strictEqual(points[0].shiftedAngle, 0);
        assert.strictEqual(points[1].shiftedAngle, 0);
        assert.strictEqual(points[2].shiftedAngle, 0);
        assert.strictEqual(points[3].shiftedAngle, 0);
    });

    QUnit.module("Pie Series. Api", {
        beforeEach: function() {
            environmentWithSinonStubPoint.beforeEach.call(this);
            this.data = [{ arg: "arg1", val: "val1", tag: "tag1" }, { arg: "arg2", val: "val2", tag: "tag2" }];
        },
        afterEach: function() {
            pointModule.Point.restore();
        }
    });

    QUnit.test("correctPosition", function(assert) {
        var series = createSeries({}),
            correctArgument = {
                centerX: true,
                centerY: true,
                radiusInner: true,
                radiusOuter: true,
                canvas: { top: 10, bottom: 15, left: 20, right: 25, width: 100, height: 200 }
            };

        series.updateData(this.data);

        series.correctPosition(correctArgument);

        $.each(series._points, function(_, p) {
            assert.ok(p.correctPosition.withArgs(correctArgument).calledOnce);
        });
        assert.deepEqual(series._visibleArea, {
            minX: 20,
            maxX: 75,
            minY: 10,
            maxY: 185
        });
    });

    QUnit.test("correct radius", function(assert) {
        var series = createSeries({});
        series.updateData(this.data);
        series.correctRadius(true);

        $.each(series._points, function(_, p) {
            assert.ok(p.correctRadius.withArgs(true).calledOnce);
        });
    });

    QUnit.test("correct label radius", function(assert) {
        var series = createSeries({});
        series.updateData(this.data);
        series.correctLabelRadius(true);

        $.each(series._points, function(_, p) {
            assert.ok(p.correctLabelRadius.withArgs(true).calledOnce);
        });
    });

    QUnit.test("Visible Area", function(assert) {
        var series = createSeries({});
        series.updateData(this.data);
        series.setVisibleArea({ top: 10, bottom: 15, left: 20, right: 25, width: 100, height: 200 });

        assert.deepEqual(series._visibleArea, {
            minX: 20,
            maxX: 75,
            minY: 10,
            maxY: 185
        });
    });

    QUnit.test("Pie. Creation", function(assert) {
        var series = createSeries({
            innerRadius: 10
        });

        assert.equal(series.innerRadius, 0);
        assert.equal(series.labelSpace, 0);
    });

    QUnit.test("doughnut. Creation", function(assert) {
        var series = createSeries({
            innerRadius: 10,
            type: "doughnut"
        });

        assert.equal(series.innerRadius, 10);
        assert.equal(series.labelSpace, 0);
    });

    QUnit.test("Get visible points", function(assert) {
        var series = createSeries({
            innerRadius: 10,
            radius: 100,
            type: "doughnut"
        });

        series.updateData(this.data);

        series.draw(this.translator, false);

        series._points[0].isVisible.returns(true);
        series._points[1].isVisible.returns(false);

        var visiblePoints = series.getVisiblePoints();

        assert.ok($.inArray(series._points[0], visiblePoints) >= 0);
        assert.ok($.inArray(series._points[1], visiblePoints) <= 0);
    });

    QUnit.test("getColor", function(assert) {
        var series = createSeries(this.options);
        assert.strictEqual(series.getColor, $.noop);
    });

    QUnit.module("draw Labels Without Points", {
        beforeEach: function() {
            environmentWithSinonStubPoint.beforeEach.call(this);
            this.data = [{ arg: "arg1", val: "val1" }, { arg: "arg2", val: "val2" }];
        },
        afterEach: environmentWithSinonStubPoint.afterEach
    });

    QUnit.test("areErrorBarsVisible", function(assert) {
        assert.ok(!createSeries({
            valueErrorBar: {
                type: "fixed",
                displayMode: "all"
            }
        }).areErrorBarsVisible(), "fixed, displayMode all");

        assert.ok(!createSeries({
            valueErrorBar: {
                type: "percent",
                displayMode: "all"
            }
        }).areErrorBarsVisible(), "percent, displayMode all");

        assert.ok(!createSeries({
            valueErrorBar: {
                type: "stdError",
                displayMode: "all"
            }
        }).areErrorBarsVisible(), "stdError, displayMode all");

        assert.ok(!createSeries({
            valueErrorBar: {
                type: "stdDeviation",
                displayMode: "all"
            }
        }).areErrorBarsVisible(), "stdDeviation, displayMode all");

        assert.ok(!createSeries({
            valueErrorBar: {
                type: "Variance",
                displayMode: "all"
            }
        }).areErrorBarsVisible(), "Variance, displayMode all");

        assert.ok(!createSeries({
            valueErrorBar: {
                type: "unknown",
                displayMode: "all"
            }
        }).areErrorBarsVisible(), "unknown, displayMode all");

        assert.ok(!createSeries({
            valueErrorBar: {
                type: "unknown",
                lowValueField: "field",
                displayMode: "all"
            }
        }).areErrorBarsVisible(), "unknown, displayMode all, lowValueField defined");

        assert.ok(!createSeries({
            valueErrorBar: {
                type: "unknown",
                highValueField: "field",
                displayMode: "all"
            }
        }).areErrorBarsVisible(), "unknown, displayMode all, highValueField defined");

        assert.ok(!createSeries({
            valueErrorBar: {
                type: "fixed",
                displayMode: "none"
            }
        }).areErrorBarsVisible(), "fixed, displayMode none");

        assert.ok(!createSeries({
            valueErrorBar: {
                type: "fixed",
                displayMode: "all"
            }
        }).updateDataType({ valueAxisType: "discrete" }).areErrorBarsVisible(), "fixed, displayMode all");

        assert.ok(!createSeries({
            valueErrorBar: {
                type: "fixed",
                displayMode: "all"
            }
        }).updateDataType({ valueAxisType: "logarithmic" }).areErrorBarsVisible(), "fixed, displayMode all");

        assert.ok(!createSeries({
            valueErrorBar: {
                type: "fixed",
                displayMode: "all"
            }
        }).updateDataType({ valueType: "datetime" }).areErrorBarsVisible(), "fixed, displayMode all");

    });

    QUnit.test("drawLabelsWOPoints", function(assert) {
        var series = createSeries();
        series.updateData(this.data);

        assert.ok(series.drawLabelsWOPoints());

        assert.ok(series.getAllPoints()[0].drawLabel.calledOnce);
        assert.ok(series.getAllPoints()[1].drawLabel.calledOnce);
        assert.ok(series._labelsGroup.append.calledOnce);
    });

    QUnit.test("drawLabelsWOPoints, label position 'inside'", function(assert) {
        var series = createSeries({ label: { position: "inside" } });
        series.updateData(this.data);

        assert.ok(!series.drawLabelsWOPoints());

        assert.ok(!series.getAllPoints()[0].drawLabel.called);
        assert.ok(!series.getAllPoints()[1].drawLabel.called);
        assert.ok(!series._labelsGroup.append.calledOnce);
    });

    QUnit.test("drawLabelsWOPoints, label is not visible", function(assert) {
        var series = createSeries({ label: { visible: false } });
        series.updateData(this.data);

        assert.ok(series.drawLabelsWOPoints());

        assert.ok(series.getAllPoints()[0].drawLabel.called);
        assert.ok(series.getAllPoints()[1].drawLabel.called);
    });

    QUnit.test("get points by argument and argumentIndex", function(assert) {
        var series = createSeries({});
        series.updateData([{ arg: "arg1", val: 1 }, { arg: "arg1", val: 2 }, { arg: "arg2", val: 3 }, { arg: "arg1", val: 4 }]);

        var points0 = series.getPointsByKeys("arg1", 0);
        var points1 = series.getPointsByKeys("arg1", 1);
        var points2 = series.getPointsByKeys("arg1", 2);

        assert.strictEqual(points0.length, 1);
        assert.strictEqual(points0[0].argument, "arg1");
        assert.strictEqual(points0[0].value, 1);

        assert.strictEqual(points1.length, 1);
        assert.strictEqual(points1[0].argument, "arg1");
        assert.strictEqual(points1[0].value, 2);

        assert.strictEqual(points2.length, 1);
        assert.strictEqual(points2[0].argument, "arg1");
        assert.strictEqual(points2[0].value, 4);
    });

    QUnit.test("get points by argument with invalid argumentIndex", function(assert) {
        var series = createSeries({});
        series.updateData([{ arg: "arg1", val: 1 }, { arg: "arg1", val: 2 }, { arg: "arg2", val: 3 }, { arg: "arg1", val: 4 }]);

        var points0 = series.getPointsByKeys("arg1", 15);

        assert.strictEqual(points0.length, 3);
    });

    QUnit.test("notify series. hover argument", function(assert) {
        var series = createSeries({});
        series.updateData([{ arg: "arg1", val: 1 }, { arg: "arg1", val: 2 }, { arg: "arg2", val: 3 }, { arg: "arg1", val: 4 }]);

        series.notify({
            action: "pointHover",

            target: {
                argumentIndex: 1,
                argument: "arg1",
                getOptions: function() {
                    return { hoverMode: "allArgumentPoints" };
                }
            }
        });

        assert.ok(!series.getAllPoints()[0].setView.called);
        assert.ok(!series.getAllPoints()[3].setView.called);

        assert.strictEqual(series.getAllPoints()[1].setView.callCount, 1);
        assert.strictEqual(series.getAllPoints()[1].setView.lastCall.args[0], "hover");
    });

    QUnit.test("notify series. clear hover argument", function(assert) {
        var series = createSeries({});
        series.updateData([{ arg: "arg1", val: 1 }, { arg: "arg1", val: 2 }, { arg: "arg2", val: 3 }, { arg: "arg1", val: 4 }]);

        series.notify({
            action: "clearPointHover",

            target: {
                argumentIndex: 1,
                argument: "arg1",
                getOptions: function() {
                    return { hoverMode: "allArgumentPoints" };
                }
            }
        });

        assert.ok(!series.getAllPoints()[0].resetView.called);
        assert.ok(!series.getAllPoints()[3].resetView.called);

        assert.strictEqual(series.getAllPoints()[1].resetView.callCount, 1);
        assert.strictEqual(series.getAllPoints()[1].resetView.lastCall.args[0], "hover");
    });

    QUnit.test("notify series. selection argument", function(assert) {
        var series = createSeries({}, { commonSeriesModes: {} });
        series.updateData([{ arg: "arg1", val: 1 }, { arg: "arg1", val: 2 }, { arg: "arg2", val: 3 }, { arg: "arg1", val: 4 }]);

        series.notify({
            action: "pointSelect",

            target: {
                argumentIndex: 1,
                argument: "arg1",
                getOptions: function() {
                    return { selectionMode: "allArgumentPoints" };
                }
            }
        });

        assert.ok(!series.getAllPoints()[0].setView.called);
        assert.ok(!series.getAllPoints()[3].setView.called);

        assert.strictEqual(series.getAllPoints()[1].setView.callCount, 1);
        assert.strictEqual(series.getAllPoints()[1].setView.lastCall.args[0], "selection");
    });

    QUnit.test("notify series. clear selection argument", function(assert) {
        var series = createSeries({}, { commonSeriesModes: {} });
        series.updateData([{ arg: "arg1", val: 1 }, { arg: "arg1", val: 2 }, { arg: "arg2", val: 3 }, { arg: "arg1", val: 4 }]);

        series.notify({
            action: "pointSelect",

            target: {
                argumentIndex: 1,
                argument: "arg1",
                getOptions: function() {
                    return { selectionMode: "allArgumentPoints" };
                }
            }
        });

        series.notify({
            action: "pointSelect",

            target: {
                argumentIndex: 0,
                argument: "arg1",
                getOptions: function() {
                    return { selectionMode: "allArgumentPoints" };
                }
            }
        });

        series.notify({
            action: "pointDeselect",

            target: {
                argumentIndex: 1,
                argument: "arg1",
                getOptions: function() {
                    return { selectionMode: "allArgumentPoints" };
                }
            }
        });

        assert.ok(!series.getAllPoints()[0].resetView.called);
        assert.ok(!series.getAllPoints()[3].resetView.called);

        assert.strictEqual(series.getAllPoints()[1].resetView.callCount, 1);
        assert.strictEqual(series.getAllPoints()[1].resetView.lastCall.args[0], "selection");
    });

    QUnit.module("adjust labels", {
        beforeEach: function() {
            environmentWithSinonStubPoint.beforeEach.call(this);
            this.data = [{ arg: "arg1", val: 10 }, { arg: "arg2", val: 20 }, { arg: "arg3", val: 30 }, { arg: "arg4", val: 40 }];
        },
        afterEach: function() {
            pointModule.Point.restore();
        }
    });

    QUnit.test("adjust labels", function(assert) {
        //arrange
        var series = createSeries();

        series.canvas = { width: 400, height: 400, left: 0, right: 0, top: 0, bottom: 0 },
        series.updateData(this.data);
        series.correctPosition({ centerX: 200, centerY: 300, radiusOuter: 25, radiusInner: 0, canvas: {} });

        //act
        series.draw();
        series.adjustLabels();

        //assert
        $.each(series.getPoints(), function(i, point) {
            assert.ok(point.setLabelEllipsis.called, "label ellipsis, point " + i);
            assert.ok(point.setLabelTrackerData.called, "label tracker data, point " + i);
            assert.equal(point.setMaxLabelLength.lastCall.args[0], 20, "label length, point " + i);
            assert.ok(point.updateLabelCoord.called, "label coords, point " + i);
        });
    });

    QUnit.test("adjust labels, lables has no text", function(assert) {
        //arrange
        var series = createSeries();

        series.canvas = { width: 400, height: 400, left: 0, right: 0, top: 0, bottom: 0 },
        series.updateData(this.data);
        $.each(series.getPoints(), function(_, point) {
            point._label.isVisible.returns(false);
        });
        series.correctPosition({ centerX: 200, centerY: 300, radiusOuter: 25, radiusInner: 0, canvas: {} });

        //act
        series.draw();
        series.adjustLabels();

        //assert
        $.each(series.getPoints(), function(i, point) {
            assert.ok(!point.setLabelEllipsis.called, "label ellipsis, point " + i);
            assert.ok(!point.setLabelTrackerData.called, "label tracker data, point " + i);
            assert.ok(!point.updateLabelCoord.called, "label coords, point " + i);
        });
    });

    QUnit.test("adjust labels, position is inside", function(assert) {
        //arrange
        var series = createSeries();
        series.canvas = { width: 400, height: 400, left: 0, right: 0, top: 0, bottom: 0 },
        series.updateData(this.data);
        $.each(series.getPoints(), function(_, point) {
            point._label.getLayoutOptions.returns({ position: "inside" });
        });
        series.correctPosition({ centerX: 200, centerY: 300, radiusOuter: 25, radiusInner: 0, canvas: {} });

        //act
        series.draw();
        series.adjustLabels();

        //arrange
        $.each(series.getPoints(), function(i, point) {
            assert.ok(!point.setLabelEllipsis.called, "label ellipsis, point " + i);
            assert.ok(point.setLabelTrackerData.called, "label tracker data, point " + i);
            assert.ok(!point.updateLabelCoord.called, "label coords, point " + i);
        });
    });
})();
