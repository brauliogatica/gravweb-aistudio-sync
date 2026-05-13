import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

// Definición de interfaces para los datos de precipitación
interface PrecipitationData {
  dates: string[];
  rain_sum: number[];
  total_rain: number;
  avg_rain: number;
  max_rain: number;
  min_rain: number;
  data_count: number;
}

interface WeatherApiResponse {
  daily: {
    time: string[];
    rain_sum: number[];
  };
  elevation?: number;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

interface PrecipitacionesProps {
  setLoadingMessage: (message: string | null) => void;
  setLoadingStyle: (style: React.CSSProperties) => void;
}

const Precipitaciones: React.FC<PrecipitacionesProps> = ({ setLoadingMessage, setLoadingStyle }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(null);
  const [precipitationData, setPrecipitationData] = useState<PrecipitationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number, lng: number } | null>(null);

  // Cargar coordenadas desde centro.json
  useEffect(() => {
    const loadCoordinates = async () => {
      try {
        const response = await import('./centro.json');
        const centerData = response.default;
        setCoordinates(centerData);
        console.log('[Precipitaciones] Coordenadas cargadas:', centerData);
      } catch (error) {
        console.error('[Precipitaciones] Error al cargar centro.json:', error);
        setError('Error al cargar coordenadas');
      }
    };

    loadCoordinates();
  }, []);

  // Validar coordenadas
  const validateCoordinates = (latitude: number, longitude: number): string[] => {
    const errors: string[] = [];

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      errors.push("Latitude must be between -90 and 90 degrees");
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      errors.push("Longitude must be between -180 and 180 degrees");
    }

    return errors;
  };

  // Calcular fecha final (un mes antes de la fecha actual)
  const calculateEndDate = (): string => {
    const currentDate = new Date();
    const endDate = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    return endDate.toISOString().split('T')[0];
  };

  // Procesar datos de lluvia
  const processRainData = (rainValues: (number | null)[]): {
    filtered_data: number[];
    total: number;
    average: number;
    maximum: number;
    minimum: number;
    count: number;
  } => {
    const validData = rainValues
      .filter((value): value is number => value !== null && !isNaN(value))
      .map(value => Number(value));

    if (validData.length === 0) {
      return {
        filtered_data: [],
        total: 0,
        average: 0,
        maximum: 0,
        minimum: 0,
        count: 0
      };
    }

    return {
      filtered_data: validData,
      total: validData.reduce((sum, val) => sum + val, 0),
      average: validData.reduce((sum, val) => sum + val, 0) / validData.length,
      maximum: Math.max(...validData),
      minimum: Math.min(...validData),
      count: validData.length
    };
  };

  // Obtener datos del clima desde OpenMeteo API
  const fetchWeatherData = async (latitude: number, longitude: number): Promise<PrecipitationData> => {
    const coordErrors = validateCoordinates(latitude, longitude);
    if (coordErrors.length > 0) {
      throw new Error(coordErrors.join('; '));
    }

    const endDate = calculateEndDate();

    const baseUrl = "https://archive-api.open-meteo.com/v1/archive";
    const params = new URLSearchParams({
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      start_date: "1970-01-01",
      end_date: endDate,
      daily: "rain_sum",
      timezone: "GMT"
    });

    const apiUrl = `${baseUrl}?${params.toString()}`;
    console.log('[Precipitaciones] API URL:', apiUrl);

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data: WeatherApiResponse = await response.json();

    if ('error' in data && (data as any).error) {
      throw new Error((data as any).reason || 'Unknown API error');
    }

    // Procesar datos de lluvia
    const rainStats = processRainData(data.daily.rain_sum);

    // Filtrar fechas que coincidan con datos válidos de lluvia
    const filteredDates: string[] = [];
    const validRainData: number[] = [];

    data.daily.rain_sum.forEach((rain, index) => {
      if (rain !== null && !isNaN(rain)) {
        validRainData.push(Number(rain));
        filteredDates.push(data.daily.time[index]);
      }
    });

    return {
      dates: filteredDates,
      rain_sum: validRainData,
      total_rain: Math.round(rainStats.total * 100) / 100,
      avg_rain: Math.round(rainStats.average * 1000) / 1000,
      max_rain: Math.round(rainStats.maximum * 100) / 100,
      min_rain: Math.round(rainStats.minimum * 100) / 100,
      data_count: rainStats.count
    };
  };

  // Cargar datos de precipitación
  const loadPrecipitationData = async () => {
    if (!coordinates) return;

    setLoading(true);
    setError(null);
    setLoadingMessage("Cargando datos de precipitación...");
    setLoadingStyle({ display: 'block' });

    try {
      const data = await fetchWeatherData(coordinates.lat, coordinates.lng);
      setPrecipitationData(data);
      setLoadingMessage(`Datos de precipitación cargados: ${data.data_count} registros`);
      console.log('[Precipitaciones] Datos cargados:', {
        total_rain: data.total_rain,
        avg_rain: data.avg_rain,
        max_rain: data.max_rain,
        data_count: data.data_count
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      setLoadingMessage(`Error al cargar precipitaciones: ${errorMessage}`);
      setLoadingStyle({ display: 'block', backgroundColor: "rgba(255,0,0,0.7)" });
      console.error('[Precipitaciones] Error:', error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setLoadingMessage(null);
        setLoadingStyle({});
      }, 3000);
    }
  };

  // Cargar datos de precipitación al montar el componente
  useEffect(() => {
    if (coordinates) {
      loadPrecipitationData();
    }
  }, [coordinates]); // Solo depende de coordinates

  // Crear o actualizar gráfico
  useEffect(() => {
    if (!precipitationData || !chartRef.current) return;

    let instance = chartInstance;
    if (!instance) {
      instance = echarts.init(chartRef.current);
      setChartInstance(instance);
    }

    // Preparar datos para el gráfico (agregación mensual para mejor visualización)
    const monthlyData = aggregateDataByMonth(precipitationData);

    const option: echarts.EChartsOption = {
      title: {
        text: 'Precipitación Histórica Diaria',
        left: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 'bold',
          color: '#ecf0f1'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function (params: any) {
          const data = params[0];
          return `${data.name}<br/>Precipitación: ${data.value.toFixed(2)} mm`;
        }
      },
      legend: {
        data: ['Precipitación'],
        top: '30px',
        textStyle: {
          fontSize: 10,
          color: '#ecf0f1'
        }
      },
      grid: {
        left: '8%',
        right: '8%',
        bottom: '8%',
        top: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: monthlyData.months,
        name: 'Período',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          color: '#ecf0f1'
        },
        axisLine: {
          lineStyle: {
            color: '#ecf0f1'
          }
        },
        axisLabel: {
          fontSize: 8,
          color: '#ecf0f1',
          rotate: 45
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: 'Precipitación (mm)',
        nameLocation: 'middle',
        nameGap: 40,
        nameRotate: 90,
        nameTextStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          color: '#ecf0f1'
        },
        axisLine: {
          lineStyle: {
            color: '#ecf0f1'
          }
        },
        axisLabel: {
          fontSize: 8,
          color: '#ecf0f1'
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(236, 240, 241, 0.1)'
          }
        }
      },
      series: [{
        name: 'Precipitación',
        type: 'bar',
        data: monthlyData.values,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#3498db' },
            { offset: 1, color: '#2980b9' }
          ]),
          borderWidth: 1,
          borderColor: '#2980b9'
        },
        emphasis: {
          itemStyle: {
            borderWidth: 2,
            shadowColor: 'rgba(52, 152, 219, 0.8)',
            shadowBlur: 10
          }
        }
      }]
    };

    instance.setOption(option, true);

    const handleResize = () => {
      instance?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [precipitationData]); // Solo depende de precipitationData

  // Agregar datos por mes para mejor visualización
  const aggregateDataByMonth = (data: PrecipitationData) => {
    const monthlyData: { [key: string]: number } = {};

    data.dates.forEach((date, index) => {
      const yearMonth = date.substring(0, 7); // YYYY-MM
      if (!monthlyData[yearMonth]) {
        monthlyData[yearMonth] = 0;
      }
      monthlyData[yearMonth] += data.rain_sum[index];
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const values = sortedMonths.map(month => monthlyData[month]);

    return {
      months: sortedMonths,
      values: values
    };
  };

  // Cleanup
  useEffect(() => {
    return () => {
      chartInstance?.dispose();
    };
  }, [chartInstance]);

  return (
    <div className="chart-section">
      <div className="chart-header">
        <h3>Datos de Precipitación</h3>
      </div>

      <div className="chart-container">
        {error && (
          <div className="chart-status error">
            Error: {error}
          </div>
        )}

        <div
          ref={chartRef}
          style={{
            width: '100%',
            height: '160px',
            background: 'transparent'
          }}
        />
      </div>
    </div>
  );
};

export default Precipitaciones; 
