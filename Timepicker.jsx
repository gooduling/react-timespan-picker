import React, { Component, PropTypes } from 'react';
import * as d3 from 'd3';
import moment from 'moment';
import './timepicker.css';
const config = {
    labelsPAdding: 13
};

class CircularTimepicker extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }
    componentWillMount() {
        let { outerRadius, innerRadius, interval, boundaryHour, showResults } = this.props;

        outerRadius = (!outerRadius || isNaN(Number(outerRadius))) ? 150 : Number(outerRadius);
        innerRadius = (!innerRadius || isNaN(Number(innerRadius) || innerRadius > outerRadius)) ? outerRadius/1.4 : Number(innerRadius);
        interval = (interval && Number.isInteger(Number(interval)) && (Number(interval) <= 60) && !(60 % Number(interval))) ? Number(interval) : 30;
        boundaryHour = (boundaryHour && Number.isInteger(Number(boundaryHour)) && (Number(boundaryHour) <= 24) ) ? Number(boundaryHour) : 8;

        const pie = d3.pie().sort(null).value(d => 1);
        const width = outerRadius * 2 + 60;
        const segmentsInHour = 60/interval;
        const totalNumberOfSegments = 720/interval;
        const segmentsArray = pie(new Array(totalNumberOfSegments));
        const hoursLabelsArray = pie(new Array(12));
        const colorScale = d3.scaleOrdinal().domain([0, 1, 2]).range(['#bbb', '#ddd']);
        const segmentsArcFn = d3.arc()
            .outerRadius(outerRadius)
            .innerRadius(innerRadius);
        const minutesArcFn = d3.arc()
            .outerRadius(outerRadius + config.labelsPAdding)
            .innerRadius(outerRadius + config.labelsPAdding)
            .startAngle(d => d.startAngle + Math.PI / totalNumberOfSegments)
            .endAngle(d => d.endAngle + Math.PI  / totalNumberOfSegments);
        const hoursArcFn = d3.arc()
            .outerRadius(outerRadius + config.labelsPAdding)
            .innerRadius(outerRadius + config.labelsPAdding)
            .startAngle(d => d.startAngle - 0.26)
            .endAngle(d => d.endAngle - 0.26);

        const configObject = {
            interval, boundaryHour, width, segmentsInHour,
            segmentsArcFn, minutesArcFn, hoursArcFn, segmentsArray,
            hoursLabelsArray, colorScale
        };
        this.setState({ configObject })
    }
    handleClick(segment) {
        const {index, value} = segment;
        const { boundaryHour,  getResults } = this.props;
        const presavedSegment = this.state[index];
        const id = Math.floor(value[1] / 60); //TODO : change id according to boundary
        const choosedPeriod = {
            [String(index)]: presavedSegment ? null
                : [ moment().set('hour', 0).set('minute', 0).minute(value[0]), moment().set('hour', 0).set('minute', 0).minute(value[1]) ]
        };
        this.setState(choosedPeriod);
        getResults({ ...this.state, ...choosedPeriod})
    }
   
    calculateHours(boundary, index, noDoubleHour) {
        const hour24 = index+12,
            hour12 = noDoubleHour ? index: index || "00",
            isInBottomQuadrant = (index > 3 && index < 10);

        if (boundary > 12) {
            boundary = boundary - 12;
            if (index === boundary) return noDoubleHour ? hour24 : isInBottomQuadrant ? `${hour24} | ${hour12}` : `${hour12} | ${hour24}`;
            return index < boundary ? hour12: hour24;
        } else {
            if (index === boundary) return noDoubleHour ? hour12 :  isInBottomQuadrant ? `${hour12} | ${hour24}`: `${hour24} | ${hour12}`;
            return index < boundary ? hour24 : hour12;
        }
    }

    getReducedArray(state) {
        const keysArr = Object.keys(state).filter(key => key !== 'configObject' && state[key]);
        if (keysArr.length) {
            if(keysArr.length === 1) return [state[keysArr[0]]];
            let reducedArr = keysArr.reduce((prev, currentKey) => {
                let tempArr = Array.isArray(prev) ? prev : [state[prev]],
                    lastElement = tempArr[tempArr.length-1],
                    currentElement = state[currentKey];

                if (!currentElement[0].diff(lastElement[1], 'minutes')) {
                    tempArr[tempArr.length-1] = [lastElement[0], currentElement[1]]
                } else {
                    tempArr.push(currentElement);
                }
                return tempArr
            });
            return reducedArr;
        }
        return keysArr
    }

    defineValue(interval, boundary, index) {
        const startMinuts = index * interval;
        const originHour = Math.floor((startMinuts) / 60);
        const realHourIndex = this.calculateHours(boundary, originHour, true) < 12 ? 0 : 720;
        return [startMinuts + realHourIndex, startMinuts + interval + realHourIndex]
    }

    render() {
        if (!this.state.configObject) return null;
        const { showResults } = this.props;
        const {
            interval, boundaryHour, width, segmentsInHour,
            segmentsArcFn, minutesArcFn, hoursArcFn, segmentsArray,
            hoursLabelsArray, colorScale
        } = this.state.configObject;
        return (
            <div className="timepickerwrapper">
                <svg width={width} height={width}>
                    <g transform={`translate(${width/2},${width/2})`}>
                        {segmentsArray.map((item, index) =>(
                            <Segment
                                key={index}
                                index={index}
                                item={item}
                                segmentArcFn={segmentsArcFn}
                                minutesArcFn={minutesArcFn}
                                label={((index % segmentsInHour) + 1) * interval}
                                fill={colorScale((Math.floor(index/segmentsInHour)) % 2)}
                                value={this.defineValue(interval, boundaryHour, index)}
                                handleClick={this.handleClick.bind(this)}
                                isActive={this.state[index]}
                                index={index}
                            />
                        ))}
                        <g className="hoursLabelsGroup">
                            {hoursLabelsArray.map((item, index) => (
                                <text
                                    key={index}
                                    className={`hourLabel${index === boundaryHour ? " boundary": ""}`}
                                    transform={`translate(${hoursArcFn.centroid(item)})`}
                                    dy=".35em"
                                    style={{'textAnchor':'middle'}}
                                >
                                    {this.calculateHours(boundaryHour, index)}
                                </text>
                            ))}
                        </g>
                    </g>
                </svg>
                {showResults ? <TimeResults results={this.getReducedArray(this.state)} /> : null}
            </div>
        );
    }
}

CircularTimepicker.propTypes = {

};

function TimeResults(props) {
    const { results } = props;
    return results.length ?
        (<div className="results">
            <h6>Selected Time</h6>
            {results.map((segment, n)=>(
                    segment.length ? <p key={n}>{segment[0].format('H:mm')} - {segment[1].format('H:mm')}</p> : null
                )
            )}
        </div>)
        : null
}

function Segment(props) {
    const {item, segmentArcFn, minutesArcFn, label, fill, value, handleClick, isActive, index} = props;
    return (
        <g className={`segment${isActive ? " active":""}`}
           onClick={()=>{handleClick({index, value})}}>
            <path
                d={segmentArcFn(item)}
                fill={fill}
            />
            {
                label === 60 ? null :
                <text
                    className="minuteLabel"
                    transform={`translate(${minutesArcFn.centroid(item)})`}
                    dy=".35em"
                >
                    {label}
                </text>
            }
        </g>
    )
}

export default CircularTimepicker;
