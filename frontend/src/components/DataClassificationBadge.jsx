import React from 'react';
import './DataClassificationBadge.css';

const DataClassificationBadge = ({ classification, showDetails = false, size = "medium" }) => {
    const getBadgeConfig = (label) => {
        const configs = {
            'INTERNAL': { 
                bgColor: 'bg-internal', 
                textColor: 'text-internal',
                borderColor: 'border-internal',
                icon: '📋',
                label: 'INTERNAL',
                description: 'Routine Medical Data',
                tooltip: 'Standard protection - Internal clinic use only',
                azureService: 'Azure Information Protection - Standard Tier'
            },
            'CONFIDENTIAL': { 
                bgColor: 'bg-confidential', 
                textColor: 'text-confidential',
                borderColor: 'border-confidential',
                icon: '🔒', 
                label: 'CONFIDENTIAL',
                description: 'Sensitive Health Information',
                tooltip: 'Encrypted storage - Role-based access control',
                azureService: 'Azure Information Protection - Premium Tier'
            },
            'HIGHLY_CONFIDENTIAL': { 
                bgColor: 'bg-highly-confidential', 
                textColor: 'text-highly-confidential',
                borderColor: 'border-highly-confidential',
                icon: '🚨',
                label: 'HIGHLY CONFIDENTIAL',
                description: 'Protected Health Information (PHI)',
                tooltip: 'Double encryption - Strict access logging - Watermarking',
                azureService: 'Azure Information Protection - Premium P2'
            },
            'RESTRICTED': { 
                bgColor: 'bg-restricted', 
                textColor: 'text-restricted',
                borderColor: 'border-restricted',
                icon: '⚡',
                label: 'RESTRICTED',
                description: 'Highly Sensitive Medical Data',
                tooltip: 'Maximum protection - Special authorization required - Geo-fencing',
                azureService: 'Azure Information Protection - Government Tier'
            }
        };
        
        return configs[label] || configs['INTERNAL'];
    };

    const config = getBadgeConfig(classification?.label);
    const sizeClasses = {
        small: 'px-2 py-1 text-xs',
        medium: 'px-3 py-1.5 text-sm',
        large: 'px-4 py-2 text-base'
    };

    return (
        <div className="classification-container">
            <div 
                className={`
                    classification-badge 
                    ${config.bgColor} 
                    ${config.textColor} 
                    ${config.borderColor}
                    ${sizeClasses[size]}
                    rounded-lg border-2 font-semibold
                    inline-flex items-center gap-2
                    transition-all duration-300 hover:scale-105
                    shadow-md
                `}
                title={config.tooltip}
            >
                <span className="text-lg">{config.icon}</span>
                <span>{config.label}</span>
            </div>
            
            {showDetails && (
                <div className="classification-details mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium">{config.description}</div>
                    <div className="text-xs text-gray-600 mt-1">{config.azureService}</div>
                    <div className="text-xs text-gray-500 mt-1">{config.tooltip}</div>
                </div>
            )}
        </div>
    );
};

// New component for classification banner (like Azure headers)
export const ClassificationBanner = ({ classification, position = "top" }) => {
    const config = getBadgeConfig(classification?.label);
    
    return (
        <div className={`
            classification-banner 
            ${config.bgColor} 
            ${config.textColor}
            py-2 px-4 text-center font-medium
            sticky ${position === 'top' ? 'top-0' : 'bottom-0'}
            z-50 shadow-lg
        `}>
            <div className="flex items-center justify-center gap-2">
                <span>{config.icon}</span>
                <span>AZURE INFORMATION PROTECTION: {config.label} - {config.description}</span>
                <span className="text-xs opacity-80">({config.azureService})</span>
            </div>
        </div>
    );
};

export default DataClassificationBadge;