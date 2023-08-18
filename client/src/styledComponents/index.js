import styled from 'styled-components';

const FlexContainer = styled.div`
    position: relative;
    width: ${props => 'calc(100vw - ' + ("rightMargin" in props ? props.rightMargin : '0px') + ')'};
    height: ${props => 'calc(100vh - ' + ("topMargin" in props ? props.topMargin : '35px') + ')'};
`;

// const ChartWrapper = styled.div`
//     position: relative;
//     margin: auto;
//     height: ${props => props.selected ? 'calc(80vh - 300px)' : '80vh'};
// `;

// NOTE for ChartWrapper to work, there CANNOT be more divs inside. The stretchy item must be immediately inside, else the middle div wouldn't be height:100
const ChartWrapper = styled.div`
    position: relative;
    margin: auto;
    height: 100%
`;


// NOTE for ChartWrapper to work, there CANNOT be more divs inside. The stretchy item must be immediately inside, else the middle div wouldn't be height:100
const ChartWrapper90 = styled.div`
    position: relative;
    margin: auto;
    height: calc(100% - 30px)
`;

export { FlexContainer, ChartWrapper, ChartWrapper90 }