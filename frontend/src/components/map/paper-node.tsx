'use client';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import { EB_Garamond } from 'next/font/google'

type PaperNode = Node<{
    title: string;
    bullets: string[];
    isExpanded?: boolean;
    layer?: number;
    hasChild?: boolean;
    isRootParent?: boolean;
    onExpand?: (id: string) => void;
}, 'paper'>;

const font = EB_Garamond({
    weight: ['400'],
    subsets: ['latin'],
});


export default function PaperNode({ id, data }: NodeProps<PaperNode>) {
    const [showSummary, setShowSummary] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const BLUE_COLOR = '#4281a4';
    const RED_COLOR = '#c1666b';
    const GRAY = '#e5e5e5';
    const WHITE = '#f4f4f4';
    const CIRCLE_SIZE = '32px';
    const CIRCLE_TOP_POSITION = '35px'; //25 (padding above font) + 10 (half of font size)
    // a lot of the sizes of the padding and whatnot have been hard coded

    const currentLayer = data.layer !== undefined ? Number(data.layer) : 1;
    const isRoot = currentLayer === 0;
    // const isMiddle = currentLayer === 1;
    const isLeaf = currentLayer === 2;

    const leftHandleColor = (isLeaf && !data.isRootParent) ? RED_COLOR : BLUE_COLOR;
    const rightHandleColor = isRoot ? BLUE_COLOR : RED_COLOR;

    return (
        <div style={{
            borderRadius: '3px',
            background: '#fff',
            border: '1px solid #ddd',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            width: '320px',
            fontFamily: `${font.style.fontFamily}`,
            boxSizing: 'border-box',
            height: 'auto',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
        }}>

            {!isRoot && (
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{
                        top: CIRCLE_TOP_POSITION,
                        transform: 'translateY(-50%)',
                        background: leftHandleColor,
                        width: CIRCLE_SIZE,
                        height: CIRCLE_SIZE,
                        border: 'none',
                        left: `calc((${CIRCLE_SIZE} / 2) * -1)`,
                        zIndex: 10
                    }}
                />
            )}

            <div style={{ padding: '25px 12px 25px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: '20px', color: '#111', overflowWrap: 'break-word' }}>
                    {data.title}
                </p>
            </div>

            <div
                onClick={() => setShowSummary(!showSummary)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="nodrag nopan"
                style={{
                    cursor: 'pointer',
                    borderTop: '0.5px solid #242323',
                    borderBottom: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    background: isHovered ? WHITE : GRAY,
                    color: '#333',
                    padding: '12px',
                    fontSize: '11px',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'background 0.15s ease',
                    boxSizing: 'border-box',
                    outline: 'none',
                    flexDirection: 'column'
                }}
            >
                {showSummary && data.bullets && data.bullets.length > 0 && (
                    <div style={{
                        padding: '4px',
                        maxHeight: '72px',
                        overflowY: 'auto',
                        width: '100%',
                        boxSizing: 'border-box'
                    }} className="nowheel">
                        <ul style={{
                            margin: 0,
                            listStyleType: 'none',
                            paddingLeft: '3px',
                            fontSize: '20px',
                            textAlign: 'left',
                            width: '100%',

                        }}>
                            {data.bullets.map((bullet, index) => (
                                <li key={index} style={{ paddingBottom: '6px', overflowWrap: 'break-word', wordBreak: 'normal' }}>
                                    {bullet}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {/* <span style={{ fontSize: '10px', textAlign: 'center' }}>{showSummary ? '▲' : '▼'}</span> */}
                <img src="/icons/chevron.svg" style={{
                    transform: showSummary ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    textAlign: 'center'
                }} />
            </div>

            {(data.hasChild) && (<Handle
                type="source"
                position={Position.Right}
                className="nodrag nopan"
                style={{
                    top: CIRCLE_TOP_POSITION,
                    transform: 'translateY(-50%)',
                    background: rightHandleColor,
                    width: CIRCLE_SIZE,
                    height: CIRCLE_SIZE,
                    border: 'none',
                    right: `calc((${CIRCLE_SIZE} / 2) * -1)`,
                    zIndex: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (data.onExpand) data.onExpand(id);
                }}
            >
                <span style={{
                    // color: '#fff',
                    // fontSize: '13px',
                    // fontWeight: 'bold',
                    // lineHeight: 1,
                    userSelect: 'none',
                    pointerEvents: 'none',
                    marginTop: '-1px',
                    display: 'flex',
                }}>
                    {data.isExpanded ? ' ' : <img src="/icons/chevron.svg" style={{
                        transform: 'translateY(-50%) rotate(-90deg)',
                        right: `calc((${CIRCLE_SIZE} * -0.75))`,
                        position: 'absolute',
                        filter: isRoot ? 'invert(48%) sepia(21%) saturate(1000%) hue-rotate(161deg) brightness(91%) contrast(88%)' : 'invert(52%) sepia(21%) saturate(1400%) hue-rotate(300deg) brightness(85%) contrast(85%)'
                    }} />}
                    {/* {data.isExpanded ? ' ' : currentLayer} */}
                </span>
            </Handle>)}
        </div>
    );
}