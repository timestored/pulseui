import styled from 'styled-components';
import { isBorderless } from './../App';

const FlexContainer = styled.div`

    position: relative;
    margin-left: 5px;
    margin-right: 5px;
    height: ${props => props.isSelected ? 'calc(100vh - 400px)' : 'calc(100vh - ' + (isBorderless() ? '0px' : '100px') + ')'};
    border: 1px solid gray;
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