/**
 * Roto 1.0
 *
 * A simple, flexible, touch-capable image spinner plugin for jQuery
 * 
 * This software (jquery.roto.1.0.js) is provided under the BSD license.
 *  
 * Copyright 2011 Robert Dallas Gray. All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 * 
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 * 
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY <COPYRIGHT HOLDER> ''AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

(function($){
	$.fn.roto = function(options) {
		var defaults = {
			btnPrev: ".prev",
			btnNext: ".next",
			direction: "h",
			speed: 200,
			shift_easing: null,
			drift_easing: "easeOutCubic",
			bounce_easing: "easeOutElastic",
			// multiplier for inertial movement
			drift_factor: 500,
			// ms length of inertial movement
			drift_duration: 1750,
			// distance user can pull the ul beyond max/min offsets
			pull_amount: 200,
			// ms length of bounce back after pulling
			bounce_duration: 1800,
			// length of timer interval -- pointer speed is only measured in last interval of movement
			timer_interval: 50
		};
		options = $.extend(defaults, options || {});
		
		options.drift_easing = (typeof jQuery.easing[options.drift_easing] === "function") ?
			options.drift_easing : "linear";
		
		options.bounce_easing = (typeof jQuery.easing[options.bounce_easing] === "function") ?
			options.bounce_easing : "linear";
		
		// allow for touch devices
		var isTouchDevice = function() {
		    try {
		        document.createEvent("TouchEvent");
		        return true;
		    } catch (e) {
		        return false;
		    }
		};
		var wrapScrollEvent = function(e) {
			if (isTouchDevice()) {
				return e.originalEvent.touches[0];
			}
			return e;
		};

		return this.each(function() {
			var orientations = { 
					h: { measure: "Width", offsetName: "left", coOrd: "X" },
					v: { measure: "Height", offsetName: "top", coOrd: "Y" }
				},
				// names of dimensions are dependent on whether the roto is horizontal or vertical
				dimensions = orientations[options.direction],
				// names of events are dependent on whether device uses touch events
				scrollEvents = isTouchDevice() ?
					{ start: "touchstart", move: "touchmove", end: "touchend" } :
					{ start: "mousedown", move: "mousemove", end: "mouseup" },
				// the element containing the buttons and ul
				container = this,
				// the ul containing the elements to be rotoed, and a cache of its li subelements
				ul = $(container).find("ul").first(), listElements = ul.find("li"),
				// the maximum offset from starting position that the roto can be moved
				maxOffset = 0,
				// the minimum offset from starting position that the roto can be moved (to be calculated below)
				minOffset = 0,
				// the current offset position, set at maxOffset = starting position
				currentOffset = maxOffset,
				// the inner width or height of the container element
				containerMeasure = 0,
				// the total width or height of the contents of the ul element
				rotoMeasure = 0,
				// unique identification of the overall container, to be used in namespacing events
				containerId = (typeof $(container).attr("id") !== undefined) ? $(container).attr("id") : new Date().getTime() + "",
				// whether animations are running
				running = false,
				// cache of the previous and next button elements
				prevButton = $(container).find(options.btnPrev), nextButton = $(container).find(options.btnNext);
				if (prevButton.length === 0 && options.btnPrev === defaults.btnPrev) {
					if ($(container).attr("id")) {
						prevButton = $("#"+$(container).attr("id")+"-prev");
						nextButton = $("#"+$(container).attr("id")+"-next");
					}
				}

			// remeasure the container and derive the minimum offset allowed
			// the minimum offset is the total measure of the listElements - the measure of the ul
			var remeasure = function() {
				containerMeasure = Math.ceil(ul.parent()[dimensions.measure.toLowerCase()]()),
				minOffset = Math.ceil(rotoMeasure - containerMeasure) * -1;
			};

			// enable or disable the previous and next buttons based on roto conditions
			var switchButtons = function() {
				// if the total measure of the listElements extends beyond the end of the ul, enable the next button
				if (rotoMeasure > (containerMeasure - currentOffset)) {
					nextButton.removeAttr("disabled");
				}
				else nextButton.attr("disabled", "disabled");

				// if the listElements are offset beyond the start of the ul, enable the previous button
				if (currentOffset < maxOffset) {
					prevButton.removeAttr("disabled");
				}
				else prevButton.attr("disabled", "disabled");
			};
		
			// shift the listElements one ul width in the given direction
			var rotoShift = function(dir) {
				// do nothing if the animation is already running
				if (running) return;
				running = true;
				
				// internal function to move the listElements by the calculated amount
				var doShift = function(move) {
					var opt = {};
					opt[dimensions.offsetName] = move;
					ul.animate(opt, options.speed, options.shift_easing, function() {
						currentOffset = move;
						switchButtons();
						running = false;
					});
				};
			
				// internal function to find the list element nearest the given offset
				var getNearestVisibleListElement = function(offset) {
					
					var pos = 0, li = listElements.get(0);
					$.each(listElements, function(idx, el) {
						// set pos to the position of the current listElement
						pos = -1 * Math.ceil($(el).position()[dimensions.offsetName]);
						// if the position of the current listElement is beyond the offset, break the loop
						if (pos < offset) {
							return false;
						}
						// set li to the current listElement
						li = el;
					});
					return li;
				};

				// 
				switch(dir) {
					case 'prev':
					// if we're moving backwards, find the element one container width towards the start of the container
					var offsetElement = getNearestVisibleListElement(currentOffset + containerMeasure);
					break;
					
					case 'next':
					// if we're moving forwards, find the element nearest the end of the container
					var offsetElement = getNearestVisibleListElement(currentOffset - containerMeasure);
					break;
				}
				// move the offsetElement to the start of the container
				var newOffset = Math.ceil($(offsetElement).position()[dimensions.offsetName]);
				var move = -1 * (containerMeasure - (containerMeasure - newOffset));
				doShift(move);
			};
			
			// track the ul to movement of the pointer
			var rotoTrack = function(pointerMove) {
				var move = Math.ceil(pointerMove + currentOffset);
					// allow user to pull the ul beyond the max/min offsets
				if (move < (maxOffset + options.pull_amount) && move > (minOffset - options.pull_amount))
					ul.css(dimensions.offsetName, move);
			};
			
			// timer to calculate speed of pointer movement
			var timer = function() {
				var startCoOrd = 0,
					currentCoOrd = 0,
					chunker = null,
					chunk = { startCoOrd: 0, endCoOrd: 0 };
				
				return {
					start: function() {
						startCoOrd = currentCoOrd;
						//only measure speed in the final 50ms of movement
						chunker = window.setInterval(function() {
							chunk.startCoOrd = startCoOrd;
							chunk.endCoOrd = currentCoOrd;
							startCoOrd = currentCoOrd;
						}, options.timer_interval);
					},
					stop: function() {
						clearInterval(chunker);
						endCoOrd = currentCoOrd;
					},
					getPointerSpeed: function() {
						var translation = chunk.endCoOrd - chunk.startCoOrd,
						 	distance = Math.abs(translation),
							speed = distance/options.timer_interval,
							dir = translation < 0 ? -1 : 1;
						return [speed, dir];
					},
					setCurrentCoOrd: function(coOrd) {
						currentCoOrd = coOrd;
					}
				}
			}();
			
			// continue ul movement inertially based on pointer speed
			var drift = function() {
				var speed_dir = timer.getPointerSpeed(),
					speed = speed_dir[0], dir = speed_dir[1];
				if (speed === 0) return;
				
				// distance to drift
				var distance = speed * options.drift_factor * dir,
					move = distance + currentOffset;

				if (move > maxOffset) move = maxOffset;
				if (move < minOffset) move = minOffset;
				var opt = {};
				opt[dimensions.offsetName] = move;
				ul.animate(opt, options.drift_duration, options.drift_easing, function() {
					if (ul.position()[dimensions.offsetName] > maxOffset) {
						bounceBack();
					}
					else {
						currentOffset = ul.position()[dimensions.offsetName];
					}
					switchButtons();
				});
			};
			
			// bounce the ul elastically after it's pulled beyond max or min offsets
			var bounceBack = function(dir) {
				var end = dir ? minOffset : maxOffset,
					opt = {};
				opt[dimensions.offsetName] = end;
				ul.animate(opt, options.bounce_duration, options.bounce_easing, function() {
					currentOffset = end;
					switchButtons();
				});
			};
			
			$(window).resize(function() {
				containerMeasure = ul.parent()[dimensions.measure.toLowerCase()](),
				remeasure();
				switchButtons();
			});

			// bind scroll events
			ul.bind(scrollEvents.start + ".roto." + containerId, function(e) {
				switchButtons();
				var linkElements = ul.find("a"),
					oldLinkEvents = {};

				if (!isTouchDevice()) {
					e.preventDefault(); // prevent drag behaviour
					if (linkElements.length > 0) {
						$(window).one(scrollEvents.move + ".roto." + containerId, function(f) {
							// intially prevent link elements responding to clicks at start of ul tracking
							linkElements.one("click.roto." + containerId, function(f) { f.preventDefault(); });
							// gather any events attached to linkElements before unbinding
							$.each(linkElements.data('events'), function(eventName, events) {
								oldLinkEvents[eventName] = [];
								$.each(events, function(i, event) {
									oldLinkEvents[eventName].push(event);
								});
							});
							// prevent linkElements responding to other events during ul tracking
							linkElements.unbind();
							// prevent linkElements responding to clicks during ul tracking
							linkElements.bind("click.roto." + containerId, function(g) {
								g.preventDefault();
							});
						});
					}
				}
				e = wrapScrollEvent(e);
				var startCoOrd = e["screen"+dimensions.coOrd];
				ul.stop();
				currentOffset = ul.position()[dimensions.offsetName];

				timer.setCurrentCoOrd(startCoOrd);

				// scrolling has started, so begin tracking pointer movement and measuring speed
				$(window).bind(scrollEvents.move + ".roto." + containerId, function(f) {
					f.preventDefault();
					f = wrapScrollEvent(f);
					timer.setCurrentCoOrd(f["screen"+dimensions.coOrd]);
					rotoTrack(f["screen"+dimensions.coOrd] - startCoOrd);
				});
				
				// user stopped scrolling
				$(window).bind(scrollEvents.end + ".roto." + containerId, function() {
					timer.stop();
					currentOffset = ul.position()[dimensions.offsetName];
					if (currentOffset > maxOffset || currentOffset < minOffset) {
						bounceBack(currentOffset < minOffset); 
					}
					else {
						drift();
					}
					$(window).unbind(scrollEvents.move + ".roto." + containerId);
					$(window).unbind(scrollEvents.end + ".roto." + containerId);
					if (!isTouchDevice() && linkElements.length > 0) {
						window.setTimeout(function() {
							// reattach old events to linkElements after a short delay
							linkElements.unbind("click.roto." + containerId);
							$.each(oldLinkEvents, function(eventName, events) {
								$.each(events, function(f, event) {
									linkElements.bind(event.type + "." + event.namespace, event.data, event.handler);
								});
							});
						}, 250);
					}
				});
				timer.start();
			});

			if (options.btnPrev) {
				prevButton.click(function() {
					return rotoShift("prev");
				});
			}
			if (options.btnNext) {
				nextButton.click(function() {
					return rotoShift("next");
				});
			}
				
			// set required styles
			$(container).css({ overflow: "hidden", position: "relative" });
			ul.css({ position: "relative", whiteSpace: "nowrap", padding: 0, margin: 0 });
			listElements.css({ display: "block", float: "left", listStyle: "none" });

			// measure the total width or height of the elements contained in the ul
			// if roto is horizontal, we have to individually measure each listElement
			if (options.direction === 'h') {
				// for each element, add the outer dimension of the element including margin and padding
				listElements.each(function(idx, el) {
					rotoMeasure += Math.ceil($(el)["outer"+dimensions.measure](true));
				});
				// set the dimension of the ul to what we measured. we need the buffer to cope with Firefox's decimal computed css measurements
				ul[dimensions.measure.toLowerCase()](rotoMeasure + (Math.ceil(rotoMeasure/100)));
			}
			else {
				// if roto is vertical we can use a simpler method to calculate size:
				// just find the position of the last element and add its outer dimension, including margin and padding
				var last = listElements.last();
				rotoMeasure = Math.round($(last).position()[dimensions.offsetName] + $(last)["outer"+dimensions.measure](true));
			}
			
			if (rotoMeasure <= containerMeasure) {
				// if the listElements don't fill the width of the ul, we don't need to show the previous or next buttons
				if (options.btnPrev) {
					prevButton.hide();
				}
				if (options.btnNext) {
					nextButton.hide();
				}
				return;
			}
						
			// begin by checking what state the buttons need to be in
			remeasure();
			switchButtons();
		});
	}
})(jQuery);

