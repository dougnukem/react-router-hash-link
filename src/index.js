import React from 'react';
import PropTypes from 'prop-types';
import { Link, NavLink } from 'react-router-dom';

let hashFragment = '';
let observer = null;
let asyncTimerId = null;
let scrollFunction = null;

function reset() {
  hashFragment = '';
  if (observer !== null) observer.disconnect();
  if (asyncTimerId !== null) {
    window.clearTimeout(asyncTimerId);
    asyncTimerId = null;
  }
}

function getElAndScroll() {
  let element = null;
  if (hashFragment === '#') {
    element = document.body;
  } else {
    // check for element with matching id before assume '#top' is the top of the document
    // see https://html.spec.whatwg.org/multipage/browsing-the-web.html#target-element
    const id = hashFragment.replace('#', '');
    element = document.getElementById(id);
    if (element === null && hashFragment === '#top') {
      element = document.body;
    }
  }

  if (element !== null) {
    scrollFunction(element);

    // update focus to where the page is scrolled to
    // unfortunately this doesn't work in safari (desktop and iOS) when blur() is called
    let originalTabIndex = element.getAttribute('tabindex');
    if (originalTabIndex === null) element.setAttribute('tabindex', -1);
    element.focus({ preventScroll: true });
    // for some reason calling blur() in safari resets the focus region to where it was previously,
    // if blur() is not called it works in safari, but then are stuck with default focus styles
    // on an element that otherwise might never had focus styles applied, so not an option
    element.blur();
    if (originalTabIndex === null) element.removeAttribute('tabindex');

    reset();
    return true;
  }
  return false;
}

function hashLinkScroll(timeout) {
  // Push onto callback queue so it runs after the DOM is updated
  window.setTimeout(() => {
    if (getElAndScroll() === false) {
      if (observer === null) {
        observer = new MutationObserver(getElAndScroll);
      }
      observer.observe(document, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      // if the element doesn't show up in specified timeout or 10 seconds, stop checking
      asyncTimerId = window.setTimeout(() => {
        reset();
      }, timeout || 10000);
    }
  }, 0);
}

export function genericHashLink(As) {
  return React.forwardRef((props, ref) => {
    function handleClick(e) {
      reset();
      if (props.onClick) props.onClick(e);
      if (typeof props.to === 'string' && props.to.includes('#')) {
        hashFragment = `#${props.to.split('#').slice(1).join('#')}`;
      } else if (
        typeof props.to === 'object' &&
        typeof props.to.hash === 'string'
      ) {
        hashFragment = props.to.hash;
      }
      if (hashFragment !== '') {
        scrollFunction =
          props.scroll ||
          ((el) =>
            props.smooth
              ? el.scrollIntoView({ behavior: 'smooth' })
              : el.scrollIntoView());
        hashLinkScroll(props.timeout);
      }
    }
    const { scroll, smooth, timeout, ...filteredProps } = props;
    return (
      <As {...filteredProps} onClick={handleClick} ref={ref}>
        {props.children}
      </As>
    );
  });
}

export const HashLink = genericHashLink(Link);

export const NavHashLink = genericHashLink(NavLink);

const propTypes = {
  onClick: PropTypes.func,
  children: PropTypes.node,
  scroll: PropTypes.func,
  timeout: PropTypes.number,
  to: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

HashLink.propTypes = propTypes;
NavHashLink.propTypes = propTypes;
