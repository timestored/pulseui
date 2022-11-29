(function (root, factory) {
    if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports, require('echarts'));
    } else {
        // Browser globals
        factory({}, root.echarts);
    }
}(this, function (exports, echarts) {
    var log = function (msg) {
        if (typeof console !== 'undefined') {
            console && console.error && console.error(msg);
        }
    };
    if (!echarts) {
        log('ECharts is not Loaded');
        return;
    }
    echarts.registerTheme('customed', {
        "color": [
            "#254588",
            "#0E8447",
            "#665191",
            "#f95d6a",
            "#da3030",
            "#a05195",
            "#ff7c43",
            "#2f4b7c",
            "#cab2d6",
            "#91ca8c",
            "#f49f42",
            "#2ec7c9",
            "#b6a2de",
            "#95706d",
            "#588dd5",
            "#59678c",
            "#c9ab00",
            "#7eb00a",
            "#c14089",
            "#32a487"
        ],
        "backgroundColor": "transparent",
        "textStyle": {},
        "title": {
            "textStyle": {
                "color": "#464646"
            },
            "subtextStyle": {
                "color": "#6e7079"
            }
        },
        "line": {
            "itemStyle": {
                "borderWidth": 1
            },
            "lineStyle": {
                "width": "2"
            },
            "symbolSize": 4,
            "symbol": "circle",
            "smooth": false
        },
        "radar": {
            "itemStyle": {
                "borderWidth": 1
            },
            "lineStyle": {
                "width": "2"
            },
            "symbolSize": 4,
            "symbol": "circle",
            "smooth": false
        },
        "bar": {
            "itemStyle": {
                "barBorderWidth": 0,
                "barBorderColor": "#cccccc"
            }
        },
        "pie": {
            "itemStyle": {
                "borderWidth": 0,
                "borderColor": "#cccccc"
            }
        },
        "scatter": {
            "itemStyle": {
                "borderWidth": 0,
                "borderColor": "#cccccc"
            }
        },
        "boxplot": {
            "itemStyle": {
                "borderWidth": 0,
                "borderColor": "#cccccc"
            }
        },
        "parallel": {
            "itemStyle": {
                "borderWidth": 0,
                "borderColor": "#cccccc"
            }
        },
        "sankey": {
            "itemStyle": {
                "borderWidth": 0,
                "borderColor": "#cccccc"
            }
        },
        "funnel": {
            "itemStyle": {
                "borderWidth": 0,
                "borderColor": "#cccccc"
            }
        },
        "gauge": {
            "itemStyle": {
                "borderWidth": 0,
                "borderColor": "#cccccc"
            }
        },
        "candlestick": {
            "itemStyle": {
                "color": "#eb5454",
                "color0": "#47b262",
                "borderColor": "#eb5454",
                "borderColor0": "#47b262",
                "borderWidth": 1
            }
        },
        "graph": {
            "itemStyle": {
                "borderWidth": 0,
                "borderColor": "#cccccc"
            },
            "lineStyle": {
                "width": 1,
                "color": "#aaaaaa"
            },
            "symbolSize": 4,
            "symbol": "circle",
            "smooth": false,
            "color": [
                "#1f3b78",
                "#09743e",
                "#665191",
                "#f95d6a",
                "#da3030",
                "#a05195",
                "#ff7c43",
                "#2f4b7c",
                "#cab2d6"
            ],
            "label": {
                "color": "#eeeeee"
            }
        },
        "map": {
            "itemStyle": {
                "areaColor": "#eee",
                "borderColor": "#444",
                "borderWidth": 0.5
            },
            "label": {
                "color": "#000"
            },
            "emphasis": {
                "itemStyle": {
                    "areaColor": "rgba(255,215,0,0.8)",
                    "borderColor": "#444",
                    "borderWidth": 1
                },
                "label": {
                    "color": "rgb(100,0,0)"
                }
            }
        },
        "geo": {
            "itemStyle": {
                "areaColor": "#eee",
                "borderColor": "#444",
                "borderWidth": 0.5
            },
            "label": {
                "color": "#000"
            },
            "emphasis": {
                "itemStyle": {
                    "areaColor": "rgba(255,215,0,0.8)",
                    "borderColor": "#444",
                    "borderWidth": 1
                },
                "label": {
                    "color": "rgb(100,0,0)"
                }
            }
        },
        "categoryAxis": {
            "axisLine": {
                "show": true,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisTick": {
                "show": true,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisLabel": {
                "show": true,
                "color": "#6E7079"
            },
            "splitLine": {
                "show": false,
                "lineStyle": {
                    "color": [
                        "#E0E6F1"
                    ]
                }
            },
            "splitArea": {
                "show": false,
                "areaStyle": {
                    "color": [
                        "rgba(250,250,250,0.2)",
                        "rgba(210,219,238,0.2)"
                    ]
                }
            }
        },
        "valueAxis": {
            "axisLine": {
                "show": false,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisTick": {
                "show": false,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisLabel": {
                "show": true,
                "color": "#6E7079"
            },
            "splitLine": {
                "show": true,
                "lineStyle": {
                    "color": [
                        "#373737"
                    ]
                }
            },
            "splitArea": {
                "show": false,
                "areaStyle": {
                    "color": ["transparent","rgba(99,99,99,0.15)"] // ["rgba(250,250,250,0.2)", "rgba(210,219,238,0.2)" ]
                }
            }
        },
        "logAxis": {
            "axisLine": {
                "show": false,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisTick": {
                "show": false,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisLabel": {
                "show": true,
                "color": "#6E7079"
            },
            "splitLine": {
                "show": true,
                "lineStyle": {
                    "color": [
                        "#E0E6F1"
                    ]
                }
            },
            "splitArea": {
                "show": false,
                "areaStyle": {
                    "color": [
                        "rgba(250,250,250,0.2)",
                        "rgba(210,219,238,0.2)"
                    ]
                }
            }
        },
        "timeAxis": {
            "axisLine": {
                "show": true,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisTick": {
                "show": true,
                "lineStyle": {
                    "color": "#6E7079"
                }
            },
            "axisLabel": {
                "show": true,
                "color": "#6E7079"
            },
            "splitLine": {
                "show": false,
                "lineStyle": {
                    "color": [
                        "#6E7079"
                    ]
                }
            },
            "splitArea": {
                "show": false,
                "areaStyle": {
                    "color": [
                        "rgba(250,250,250,0.2)",
                        "rgba(210,219,238,0.2)"
                    ]
                }
            }
        },
        "toolbox": {
            "iconStyle": {
                "borderColor": "#999999"
            },
            "emphasis": {
                "iconStyle": {
                    "borderColor": "#666666"
                }
            }
        },
        "legend": {
            "textStyle": {
                "color": "#a1a1a1"
            }
        },
        "tooltip": {
            "axisPointer": {
                "lineStyle": {
                    "color": "#cccccc",
                    "width": 1
                },
                "crossStyle": {
                    "color": "#cccccc",
                    "width": 1
                }
            }
        },
        "timeline": {
            "lineStyle": {
                "color": "#dae1f5",
                "width": 2
            },
            "itemStyle": {
                "color": "#a4b1d7",
                "borderWidth": 1
            },
            "controlStyle": {
                "color": "#a4b1d7",
                "borderColor": "#a4b1d7",
                "borderWidth": 1
            },
            "checkpointStyle": {
                "color": "#316bf3",
                "borderColor": "#ffffff"
            },
            "label": {
                "color": "#a4b1d7"
            },
            "emphasis": {
                "itemStyle": {
                    "color": "#ffffff"
                },
                "controlStyle": {
                    "color": "#a4b1d7",
                    "borderColor": "#a4b1d7",
                    "borderWidth": 1
                },
                "label": {
                    "color": "#a4b1d7"
                }
            }
        },
        "visualMap": {
            "color": [
                "#bf444c",
                "#d88273",
                "#f6efa6"
            ]
        },
        "dataZoom": {
            "handleSize": "undefined%",
            "textStyle": {}
        },
        "markPoint": {
            "label": {
                "color": "#eeeeee"
            },
            "emphasis": {
                "label": {
                    "color": "#eeeeee"
                }
            }
        }
    });
}));
