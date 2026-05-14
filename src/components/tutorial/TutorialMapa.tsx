import React, { useEffect, useState } from 'react';
import './TutorialMapa.css'; // Opcional: para estilos personalizados

const TutorialMapa: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const maxAreaHaValue = Number(import.meta.env.VITE_MAX_AREA_HECTARES ?? 100);
    const maxAreaHa = (Number.isFinite(maxAreaHaValue) ? maxAreaHaValue : 100).toFixed(2);

    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
        if (!hasSeenTutorial) {
            setIsOpen(true);
        }
    }, []);

    const closeModal = () => {
        if (dontShowAgain) {
            localStorage.setItem('hasSeenTutorial', 'true');
        }
        setIsOpen(false);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="tutorial-modal">
            <div className="tutorial-content">
                <h5>Te damos la bienvenida a Gravitacional</h5>
                <p>Sigue las instrucciones para comenzar.</p>
                <ul>
                    <li>1: Selecciona un polígono en el mapa.</li>
                    <li>2: Confirma tu selección.</li>
                    <li>3: Espera a que se procese.</li>
                </ul>
                <p>El área máxima es de {maxAreaHa} hectáreas.</p>
                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                        />
                        No volver a mostrar
                    </label>
                </div>

                <button onClick={closeModal}>Cerrar</button>
            </div>
        </div>
    );
};

export default TutorialMapa;
