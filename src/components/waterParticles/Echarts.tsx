// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts'; // Importar ECharts

// Definición de interfaces para los datos del gráfico
interface ChartDataObject {
  name: string;
  type: string;
  xAxisIndex?: number;
  data: Array<[number, number]>; // Aseguramos que data es un array de tuplas [number, number]
  lineStyle?: {
    color?: string;
    width?: number;
  };
  itemStyle?: {
    color?: string;
    borderWidth?: number;
    borderColor?: string;
  };
  symbol?: string;
  symbolSize?: number;
  smooth?: boolean;
  emphasis?: {
    itemStyle?: {
      borderWidth?: number;
      shadowColor?: string;
      shadowBlur?: number;
    };
  };
}

// Interfaz EchartsData como estaba definida originalmente, ya que EChartsOption es muy amplia
interface EchartsData {
  title?: {
    text?: string;
    left?: string;
    textStyle?: {
      fontSize?: number;
      fontWeight?: string;
      color?: string;
    };
  };
  tooltip?: {
    trigger?: string;
    axisPointer?: {
      type?: string;
    };
  };
  legend?: {
    data?: string[];
    top?: string;
    textStyle?: {
      fontSize?: number;
    };
  };
  grid?: {
    left?: string;
    right?: string;
    bottom?: string;
    top?: string;
    containLabel?: boolean;
  };
  xAxis?: Array<{
    type?: string;
    name?: string;
    nameLocation?: string;
    nameGap?: number;
    min?: number;
    max?: number;
    nameTextStyle?: {
      fontSize?: number;
      fontWeight?: string;
      color?: string;
    };
    axisLine?: {
      lineStyle?: {
        color?: string;
      };
    };
    splitLine?: {
      show?: boolean;
      lineStyle?: {
        color?: string;
      };
    };
    position?: string;
    axisLabel?: {
      color?: string;
      fontSize?: number; // Añadido para consistencia
    };
    show?: boolean;
  }>;
  yAxis?: {
    type?: string;
    name?: string;
    nameLocation?: string;
    nameGap?: number;
    nameRotate?: number;
    min?: number;
    max?: number;
    nameTextStyle?: {
      fontSize?: number;
      fontWeight?: string;
    };
    axisLine?: {
      lineStyle?: {
        color?: string;
      };
    };
    splitLine?: {
      show?: boolean;
      lineStyle?: {
        color?: string;
      };
    };
    axisLabel?: {  // Añadido para consistencia
      fontSize?: number;
    };
  };
  series?: ChartDataObject[];
}

interface EchartsViewerProps {
  setLoadingMessage: (message: string | null) => void;
  setLoadingStyle: (style: React.CSSProperties) => void;
}

const EchartsViewer: React.FC<EchartsViewerProps> = ({ setLoadingMessage, setLoadingStyle }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null);
  const [chartData, setChartData] = useState<EchartsData | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const loadChartData = async () => {
      setLoadingMessage("Cargando datos del gráfico...");
      setLoadingStyle({ display: 'block' });
      try {
        const response = await fetch('/demo/echarts.json');
        const rawJsonData = await response.json();

        // Transformar los datos antes de asignarlos a chartData
        const transformedSeries = rawJsonData.series?.map((s: any) => ({
          ...s,
          data: s.data.map((dp: any) => {
            if (Array.isArray(dp) && dp.length === 2 && typeof dp[0] === 'number' && typeof dp[1] === 'number') {
              return [dp[0], dp[1]] as [number, number];
            }
            console.warn("Punto de dato inválido en series:", dp);
            return [0, 0] as [number, number];
          })
        }));

        const jsonData: EchartsData = {
          ...rawJsonData,
          series: transformedSeries,
        };

        if (jsonData && jsonData.series && jsonData.series.length > 0) {
          setChartData(jsonData);
          setLoadingMessage("Datos del gráfico cargados.");
        } else {
          throw new Error("Datos del gráfico inválidos o vacíos.");
        }
      } catch (error) {
        console.error("Error al cargar echarts.json:", error);
        setLoadingMessage("Error al cargar datos del gráfico: " + (error as Error).message);
        setLoadingStyle({ display: 'block', backgroundColor: "rgba(255,0,0,0.7)" });
      } finally {
        setTimeout(() => {
          setLoadingMessage(null);
          setLoadingStyle({});
        }, 2000);
      }
    };

    loadChartData();
  }, [setLoadingMessage, setLoadingStyle]);


  useEffect(() => {
    if (chartRef.current && chartData && !chartInstance) {
      const instance = echarts.init(chartRef.current);
      setChartInstance(instance);
    }

    if (chartInstance && chartData) {
      const config = adaptConfigForSidebar(chartData as echarts.EChartsOption);
      chartInstance.setOption(config, true);
    }

    return () => {
      chartInstance?.dispose();
    };
  }, [chartData, chartInstance]);

  const adaptConfigForSidebar = (originalConfig: echarts.EChartsOption): echarts.EChartsOption => {
    if (!originalConfig.series || !Array.isArray(originalConfig.series) || originalConfig.series.length < 2) {
      console.warn("La configuración original no tiene suficientes series para adaptar.");
      return originalConfig;
    }

    const seriesData = originalConfig.series as echarts.SeriesOption[];
    // Asegurar que los datos de la serie son del tipo Array<[number, number]>
    const capacitySeries = seriesData[0] as ChartDataObject | undefined;
    const areaSeries = seriesData[1] as ChartDataObject | undefined;

    const capacityData = capacitySeries?.data;
    const areaData = areaSeries?.data;

    if (!capacityData || !areaData) {
      console.warn("Datos de series incompletos para adaptar.");
      return originalConfig;
    }

    const elevations = capacityData.map(d => d[1]);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);

    // Clonar para evitar mutaciones directas no deseadas
    const configClone = JSON.parse(JSON.stringify(originalConfig));

    // Aplicar adaptaciones
    configClone.title = {
      ...(configClone.title as echarts.TitleComponentOption),
      text: "Curvas de Capacidad",
      textStyle: {
        ...(configClone.title as echarts.TitleComponentOption)?.textStyle,
        fontSize: 12,
        color: '#ecf0f1',
        fontWeight: 'bold'
      },
    };

    // Configuración específica del tooltip basada en la versión de desarrollo
    configClone.tooltip = {
      trigger: 'axis',
      backgroundColor: 'rgba(50, 50, 50, 0.95)',
      borderColor: '#777',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 10
      },
      extraCssText: 'z-index: 999999 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-radius: 6px; position: fixed !important;',
      confine: false,
      enterable: false,
      hideDelay: 300,
      showDelay: 0,
      appendToBody: true,
      formatter: function (params: any) {
        if (!params || params.length === 0) return '';

        let elevation = params[0].value[1];
        let result = `<div style="font-weight: bold; margin-bottom: 3px; color: #fff;">Elev: ${elevation}m</div>`;

        for (let param of params) {
          let value = param.value[0];
          let color = param.color;

          if (param.seriesName.includes('Capacity')) {
            result += `<div style="color: #fff;"><span style="display:inline-block;width:8px;height:8px;background:${color};border-radius:50%;margin-right:3px;"></span>Cap: ${value.toLocaleString()}m³</div>`;
          } else if (param.seriesName.includes('Area')) {
            result += `<div style="color: #fff;"><span style="display:inline-block;width:8px;height:8px;background:${color};border-radius:50%;margin-right:3px;"></span>Área: ${value}ha</div>`;
          }
        }
        return result;
      }
    };

    configClone.grid = {
      ...(configClone.grid as echarts.GridComponentOption),
      left: '15%',
      right: '10%',
      bottom: '20%',
      top: '18%',
    };
    configClone.legend = {
      ...(configClone.legend as echarts.LegendComponentOption),
      top: 'bottom',
      textStyle: {
        ...(configClone.legend as echarts.LegendComponentOption)?.textStyle,
        fontSize: 10,
      },
    };

    if (Array.isArray(configClone.xAxis)) {
      configClone.xAxis = (configClone.xAxis as echarts.XAXisComponentOption[]).map((axis: echarts.XAXisComponentOption) => ({
        ...axis,
        nameTextStyle: {
          ...axis.nameTextStyle,
          fontSize: 10,
          color: '#ecf0f1'
        },
        axisLabel: {
          ...(axis.axisLabel as any),
          fontSize: 9,
          color: '#ecf0f1'
        }
      }));
    } else if (configClone.xAxis) { // Single xAxis object
      const axis = configClone.xAxis as echarts.XAXisComponentOption;
      configClone.xAxis = {
        ...axis,
        nameTextStyle: {
          ...axis.nameTextStyle,
          fontSize: 10,
          color: '#ecf0f1'
        },
        axisLabel: {
          ...(axis.axisLabel as any),
          fontSize: 9,
          color: '#ecf0f1'
        }
      };
    }

    configClone.yAxis = {
      ...(configClone.yAxis as echarts.YAXisComponentOption),
      min: Math.floor(minElevation),
      max: Math.ceil(maxElevation),
      nameTextStyle: {
        ...(configClone.yAxis as echarts.YAXisComponentOption)?.nameTextStyle,
        fontSize: 10,
        color: '#ecf0f1'
      },
      axisLabel: {
        ...(configClone.yAxis as echarts.YAXisComponentOption)?.axisLabel as any,
        fontSize: 9,
        color: '#ecf0f1'
      }
    };
    configClone.series = seriesData.map(serie => ({
      ...serie,
      symbolSize: 5,
      lineStyle: {
        ...serie.lineStyle,
        width: 2,
      }
    }));
    configClone.toolbox = undefined;
    configClone.dataZoom = undefined;

    return configClone;
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (chartInstance) {
      setTimeout(() => chartInstance.resize(), 350);
    }
  };

  const chartSectionStyle: React.CSSProperties = {
    backgroundColor: 'rgba(52, 73, 94, 0.6)',
    border: '1px solid rgba(41, 128, 185, 0.3)',
    borderRadius: '4px',
    overflow: 'hidden',
    margin: '8px 0',
    position: 'relative',
    zIndex: 1000,
  };

  const chartHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: isHovered ? 'rgba(41, 128, 185, 0.8)' : 'rgba(41, 128, 185, 0.6)',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  };

  const chartTitleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '11px',
    color: '#ecf0f1',
    textShadow: '1px 1px 1px rgba(0, 0, 0, 0.5)',
    letterSpacing: '0.5px',
    fontWeight: '500',
  };

  const chartToggleStyle: React.CSSProperties = {
    fontSize: '8px',
    color: '#ecf0f1',
    transition: 'transform 0.3s ease',
    transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
  };

  const chartContainerStyle: React.CSSProperties = {
    height: isCollapsed ? '0' : '220px',
    width: '100%',
    overflow: 'hidden',
    transition: 'height 0.3s ease',
    padding: isCollapsed ? '0 6px' : '6px',
    backgroundColor: 'rgba(44, 62, 80, 0.3)',
  };


  if (!chartData) {
    return <div style={chartSectionStyle}>Cargando datos del gráfico...</div>;
  }

  return (
    <div style={chartSectionStyle}>
      <div
        style={chartHeaderStyle}
        onClick={toggleCollapse}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <h3 style={chartTitleStyle}>Curvas de Capacidad</h3>
        <span style={chartToggleStyle}>{isCollapsed ? "▶" : "▼"}</span>
      </div>
      <div ref={chartRef} style={chartContainerStyle} />
    </div>
  );
};

export default EchartsViewer; 
