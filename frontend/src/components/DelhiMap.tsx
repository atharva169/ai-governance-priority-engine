"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Delhi Zones Definition
const ZONES = [
    { id: "North Delhi", name: "North Delhi" },
    { id: "South Delhi", name: "South Delhi" },
    { id: "East Delhi", name: "East Delhi" },
    { id: "West Delhi", name: "West Delhi" },
    { id: "Central Delhi", name: "Central Delhi" }
];

interface Issue {
    region: string;
    score: number;
}

interface DelhiMapProps {
    issues: Issue[];
    userZone?: string | null; // e.g., "East Delhi" or "All Delhi" or null
}

// -------------------------------------------------------------
// Simplified SVG Paths for Delhi Zones (Stylized Representation)
// These paths are approximations for visual context, not
// exact geopolitical boundaries, keeping the UI clean.
// -------------------------------------------------------------
const ZONE_PATHS: Record<string, string> = {
    "North Delhi": "M230.325,64.486L229.705,66.643L230.641,69.498L230.922,72.587L235.487,81.116L240.253,88.757L249.005,97.866L248.095,118.873L247.466,120.432L246.767,140.988L249.484,145.131L251.474,145.754L251.74,145.898L252.201,149.273L253.111,151.745L246.999,152.909L245.699,153.818L241.966,153.891L240.463,155.687L236.95,155.757L234.508,154.48L230.766,154.113L225.387,148.699L221.887,149.432L219.445,148.155L214.156,147.378L213.54,148.983L213.528,148.937L205.851,149.533L204.946,148.226L202.701,145.842L204.603,142.049L204.726,141.944L208.06,139.108L209.026,132.463L211.569,127.773L214.214,128.162L217.289,128.1L222.803,129.094L224.327,128.401L230.18,124.308L232.545,121.61L234.202,116.497L233.65,110.763L230.329,109.504L218.847,106.861L213.736,104.091L208.155,99.784L203.883,95.008L202.094,93.498L201.834,91.514L201.781,88.863L209.987,81.405L211.627,75.404L215.583,75.325L228.071,62.467L229.483,64.115ZM204.726,141.944L202.34,138.782L195.299,138.262L193.95,136.743L174.406,137.364L169.547,136.138L161.93,129.007L154.777,133.794L150.966,130.118L148.783,130.826L146.11,129.115L141.553,131.861L138.207,129.501L130.3,129.668L119.266,127.471L110.362,132.52L103.128,133.337L91.055,123.656L82.54,124.147L82.76,123.766L83.001,120.511L80.852,117.554L75.14,112.661L80.703,99.596L79.846,96.209L80.502,92.741L78.811,89.727L73.369,84.005L78.329,74.315L76.79,71.288L75.831,65.076L76.288,60.126L72.978,54.48L72.916,50.673L75.847,42.915L79.334,44.951L83.794,43.363L85.125,36.424L86.791,35.524L92.526,39.953L94.377,39.459L97.846,32.146L100.18,30.544L103.854,30.499L113.821,33.132L121.005,31.933L124.475,32.465L128.525,32.123L132.155,21.359L139.308,7.621L148.697,7.755L151.35,3.047L154.717,0L159.134,6.683L168.637,8.151L173.168,10.839L174.679,12.41L185.801,12.921L189.648,17.569L189.942,21.474L188.885,26.846L192.065,28.898L193.944,28.363L198.828,24.341L204.12,18.297L207.07,16.138L218.322,15.029L220.222,11.987L224.129,12.984L227.763,13.26L230.802,14.632L232.591,16.443L234.727,20.009L234.214,26.499L238.165,33.24L235.976,47.903L224.746,46.651L224.632,55.442L226.094,60.159L228.071,62.467L215.583,75.325L211.627,75.404L209.987,81.405L201.781,88.863L201.834,91.514L202.094,93.498L203.883,95.008L208.155,99.784L213.736,104.091L218.847,106.861L230.329,109.504L233.65,110.763L234.202,116.497L232.545,121.61L230.18,124.308L224.327,128.401L222.803,129.094L217.289,128.1L214.214,128.162L211.569,127.773L209.026,132.463L208.06,139.108Z",
    "South Delhi": "M259.928,182.835L260.54,182.891L263.926,187.681L266.599,189.616L267.101,192.917L271.107,195.708L274.872,197.401L278.435,199.981L283.678,203.441L282.975,205.135L283.049,213.86L283.866,217.574L288.505,224.799L289.319,225.621L293.002,229.339L295.477,230.819L299.378,234.603L302.355,239.036L304.682,242.501L306.144,244.138L306.719,244.781L306.868,245.08L308.404,248.157L308.933,252.661L306.998,251.232L303.769,253.085L302.4,256.35L299.463,259.084L295.428,262.316L290.698,264.915L287.205,265.29L284.443,264.595L278.264,261.155L273.699,259.892L269.607,260.639L263.091,266.402L259.479,268.335L252.791,268.968L249.299,272.262L246.741,274.87L243.911,278.923L242.798,282.774L243.201,285.29L247.139,285.834L251.124,289.756L253.135,293.861L253.727,297.77L253.067,303.124L251.552,306.357L240.991,312.982L236.594,315.14L231.044,316.708L224.739,317.286L215.458,317.382L207.348,320L200.625,311.387L199.165,306.678L193.594,301.711L187.095,299.702L182.776,299.341L179.371,297.196L175.963,291.957L173.746,287.181L172.158,281.449L170.214,278.39L169.504,274.345L170.577,269.891L171.775,266.528L171.986,266.523L175.275,266.456L178.981,265.277L183.34,263.864L188.335,261.336L194.142,255.484L203.454,249.34L209.257,243.267L210.736,240.37L210.709,239.047L210.437,236.405L214.312,232.577L216.453,229.886L216.414,227.901L215.927,225.484L216.089,222.612L219.504,217.69L221.405,213.901L230.104,209.755L230,204.461L229.539,203.366L229.474,200.057L237.03,193.507L239.441,193.238L249.361,183.993L256.58,182.527ZM211.568,155.492L212.316,156.69L212.003,160.622L210.536,165.362L210.559,166.539L214.15,170.392L214.036,170.626L205.524,188.177L205.551,189.501L206.266,192.356L208.308,195.625L211.644,197.765L218.716,200.051L222.683,200.855L229.539,203.366L230,204.461L230.104,209.755L221.405,213.901L219.504,217.69L216.089,222.612L215.927,225.484L216.414,227.901L216.453,229.886L214.312,232.577L210.437,236.405L210.709,239.047L210.736,240.37L209.257,243.267L203.454,249.34L194.142,255.484L188.335,261.336L183.34,263.864L178.981,265.277L175.275,266.456L171.986,266.523L171.775,266.528L173.146,262.681L170.692,260.266L162.913,254.897L160.354,251.265L152.395,244.934L149.439,244.688L143.229,249.23L138.398,248.303L134.204,245.801L129.191,239.499L121.217,236.182L118.874,236.143L113.238,229.799L109.762,230.307L107.248,233.736L108.574,236.929L112.577,239.22L116.345,242.327L116.072,246.41L112.89,248.814L103.877,245.223L95.777,242.511L91.016,239.978L76.934,249.323L70.202,247.699L63.97,245.529L55.593,248.444L49.094,246.518L46.891,247.608L42.805,250.9L38.414,252.358L35.134,248.77L38.475,242.329L36.628,239.37L26.551,230.28L25.097,226.321L13.813,220.149L11.067,203.011L12.321,197.037L21.295,197.907L24,196.414L27.604,189.59L37.687,166.001L46.977,169.293L49.098,169.262L53.073,165.812L56.817,165.89L64.664,172.063L66.03,171.66L70.717,166.023L61.464,155.515L61.049,152.83L64.375,144.798L68.288,141.306L75.676,140.859L75.74,143.843L78.914,146.13L82.012,144.885L85.551,145.986L91.499,150.176L97.023,152.806L102.165,155.836L106.201,162.031L108.61,165.12L111.01,167.816L115.702,168.109L118.857,169.612L120.842,171.14L124.03,174.212L125.665,177.71L126.478,179.263L136.235,179.057L139.69,176.237L148.659,175.657L154.513,175.535L158.026,175.462L167.481,179.584L170.587,178.735L174.792,174.331L180.87,165.964L185.53,164.691L188.996,162.265L193.609,158.638L200.62,157.711L205.671,156.431L211.105,154.751Z",
    "East Delhi": "M283.678,203.441L278.435,199.981L274.872,197.401L271.107,195.708L267.101,192.917L266.599,189.616L263.926,187.681L260.54,182.891L259.928,182.835L259.873,182.462L258.69,178.071L258.858,175.418L258.824,173.653L257.493,172.495L256.59,171.709L255.614,166.65L256.006,164.214L255.912,159.358L253.111,151.745L252.201,149.273L251.74,145.898L251.689,145.529L258.497,145.396L272.215,138.945L283.413,138.508L287.847,140.631L291.324,138.577L297.388,138.227L297.347,139.212L297.183,143.151L297.172,143.398L295.905,149.017L295.896,149.97L295.893,150.408L295.836,157.01L294.505,160.167L293.397,161.526L294.792,162.494L294.984,162.708L296.186,164.039L299.146,167.321L302.254,169.045L304.751,170.431L306.965,173.403L308.647,176.825L308.916,179.781L308.108,185.571L306.308,187.025L303.179,188.252L296.738,191.554L294.616,191.897L292.603,192.222L290.955,193.596L290.012,194.866L289.773,195.187L283.729,203.319ZM251.74,145.898L251.474,145.754L249.484,145.131L246.767,140.988L247.466,120.432L248.095,118.873L249.005,97.866L240.253,88.757L235.487,81.116L230.922,72.587L230.641,69.498L229.705,66.643L230.325,64.486L232.882,65.612L235.607,66.116L236.175,65.969L237.446,65.641L238.682,65.321L239.831,65.322L241.808,65.323L242.464,65.324L240.925,67.943L237.981,69.321L240.228,71.868L243.689,74.528L245.019,75.55L248.628,81.637L250.292,84.445L250.582,84.524L254.94,85.711L256.47,85.586L259.261,88.782L258.473,93.684L261.005,97.431L263.219,98.652L267.018,97.875L269.825,98.613L273.206,101.166L275.464,104.102L275.554,104.271L277.664,108.21L277.209,111.54L277.939,115.927L282.676,117.735L284.26,115.54L287.714,113.062L290.523,112.432L296.977,112.746L300.708,113.653L299.626,116.371L298.544,121.868L299.183,124.541L303.095,129.81L302.825,134.304L301.935,135.852L301.798,136.09L297.389,138.209L297.388,138.227L291.324,138.577L287.847,140.631L283.413,138.508L272.215,138.945L258.497,145.396L251.689,145.529Z",
    "West Delhi": "M204.726,141.944L204.603,142.049L202.701,145.842L204.946,148.226L205.851,149.533L213.528,148.937L213.54,148.983L214.244,151.793L214.938,153.546L211.568,155.492L211.105,154.751L205.671,156.431L200.62,157.711L193.609,158.638L188.996,162.265L185.53,164.691L180.87,165.964L174.792,174.331L170.587,178.735L167.481,179.584L158.026,175.462L154.513,175.535L148.659,175.657L139.69,176.237L136.235,179.057L126.478,179.263L125.665,177.71L124.03,174.212L120.842,171.14L118.857,169.612L115.702,168.109L111.01,167.816L108.61,165.12L106.201,162.031L102.165,155.836L97.023,152.806L91.499,150.176L85.551,145.986L82.012,144.885L78.914,146.13L75.74,143.843L75.676,140.859L75.857,140.848L78.637,139.472L77.866,135.225L79.31,132.193L80.274,128.063L82.54,124.147L91.055,123.656L103.128,133.337L110.362,132.52L119.266,127.471L130.3,129.668L138.207,129.501L141.553,131.861L146.11,129.115L148.783,130.826L150.966,130.118L154.777,133.794L161.93,129.007L169.547,136.138L174.406,137.364L193.95,136.743L195.299,138.262L202.34,138.782Z",
    "Central Delhi": "M257.493,172.495L255.51,172.614L246.822,166.381L243.964,166.217L240.842,163.85L233.962,160.232L222.346,161.568L219.975,163.823L216.286,166.105L214.612,170.333L214.036,170.626L214.15,170.392L210.559,166.539L210.536,165.362L212.003,160.622L212.316,156.69L211.568,155.492L214.938,153.546L214.244,151.793L213.54,148.983L214.156,147.378L219.445,148.155L221.887,149.432L225.387,148.699L230.766,154.113L234.508,154.48L236.95,155.757L240.463,155.687L241.966,153.891L245.699,153.818L246.999,152.909L253.111,151.745L255.912,159.358L256.006,164.214L255.614,166.65L256.59,171.709ZM257.493,172.495L258.824,173.653L258.858,175.418L258.69,178.071L259.873,182.462L259.928,182.835L256.58,182.527L249.361,183.993L239.441,193.238L237.03,193.507L229.474,200.057L229.539,203.366L222.683,200.855L218.716,200.051L211.644,197.765L208.308,195.625L206.266,192.356L205.551,189.501L205.524,188.177L214.036,170.626L214.612,170.333L216.286,166.105L219.975,163.823L222.346,161.568L233.962,160.232L240.842,163.85L243.964,166.217L246.822,166.381L255.51,172.614Z"
};

const ZONES_CENTERS: Record<string, { x: number, y: number }> = {
    "North Delhi": { x: 70, y: 40 },
    "West Delhi": { x: 55, y: 95 },
    "Central Delhi": { x: 110, y: 80 },
    "East Delhi": { x: 155, y: 90 },
    "South Delhi": { x: 105, y: 130 },
};

export function DelhiMap({ issues, userZone }: DelhiMapProps) {
    const [hoveredZone, setHoveredZone] = useState<string | null>(null);

    // Calculate average score per zone
    const zoneData = useMemo(() => {
        const data: Record<string, { totalScore: number; count: number; avg: number }> = {};

        ZONES.forEach(z => {
            data[z.id] = { totalScore: 0, count: 0, avg: 0 };
        });

        issues.forEach(issue => {
            // Very simple region matching
            const matchedZone = ZONES.find(z => issue.region.includes(z.name));
            if (matchedZone) {
                data[matchedZone.id].totalScore += issue.score;
                data[matchedZone.id].count += 1;
            }
        });

        Object.keys(data).forEach(zoneId => {
            if (data[zoneId].count > 0) {
                data[zoneId].avg = Math.round(data[zoneId].totalScore / data[zoneId].count);
            }
        });

        return data;
    }, [issues]);

    const getZoneColor = (zoneId: string, avgScore: number) => {
        // If the user's jurisdiction doesn't include this zone, gray it out
        if (userZone && userZone !== "All Delhi" && userZone !== zoneId) {
            return "fill-slate-100/50 stroke-slate-200";
        }

        // If no data
        if (avgScore === 0) {
            return "fill-slate-100 stroke-slate-300";
        }

        // Active colors based on risk
        if (avgScore > 55) return "fill-red-500 stroke-red-600";
        if (avgScore >= 45) return "fill-amber-400 stroke-amber-500";
        return "fill-emerald-400 stroke-emerald-500";
    };

    return (
        <Card className="rounded-sm border-slate-200">
            <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row items-center gap-6">

                {/* SVG MAP */}
                <div className="relative shrink-0 flex items-center justify-center p-4 bg-slate-50 rounded-md border border-slate-100">
                    <TooltipProvider delayDuration={100}>
                        <svg viewBox="0 0 320 320" className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
                            {ZONES.map((zone) => {
                                const avgScore = zoneData[zone.id].avg;
                                const isAccessible = !userZone || userZone === "All Delhi" || userZone === zone.id;
                                const isHovered = hoveredZone === zone.id;

                                return (
                                    <Tooltip key={zone.id}>
                                        <TooltipTrigger asChild>
                                            <g
                                                onMouseEnter={() => isAccessible && setHoveredZone(zone.id)}
                                                onMouseLeave={() => setHoveredZone(null)}
                                                className={`transition-all duration-300 ${isAccessible ? "cursor-pointer" : "cursor-not-allowed"}`}
                                            >
                                                <path
                                                    d={ZONE_PATHS[zone.id]}
                                                    className={`stroke-[1.5px] transition-all duration-300 ${getZoneColor(zone.id, avgScore)} ${isHovered && isAccessible ? "filter brightness-110 -translate-y-0.5 drop-shadow-md" : ""
                                                        }`}
                                                />
                                                {/* Optional: Add tiny labels directly on map if needed */}
                                                {/* <text x={ZONES_CENTERS[zone.id].x} y={ZONES_CENTERS[zone.id].y} className="text-[6px] fill-white pointer-events-none font-bold text-anchor-middle alignment-baseline-middle">
                                                    {zone.name.split(" ")[0]}
                                                </text> */}
                                            </g>
                                        </TooltipTrigger>
                                        {isAccessible && (
                                            <TooltipContent className="bg-slate-900 text-white border-0 shadow-xl px-3 py-2 rounded-sm" sideOffset={5}>
                                                <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-0.5">{zone.name}</p>
                                                {avgScore > 0 ? (
                                                    <p className="text-sm font-medium">Avg Priority: <span className={`font-bold ${avgScore > 55 ? "text-red-400" : avgScore >= 45 ? "text-amber-400" : "text-emerald-400"}`}>{avgScore}</span></p>
                                                ) : (
                                                    <p className="text-sm text-slate-400">No active issues</p>
                                                )}
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                );
                            })}
                        </svg>
                    </TooltipProvider>

                    {/* Simple Compass Rose / Note */}
                    <div className="absolute top-4 left-4 text-[10px] uppercase font-bold tracking-widest text-slate-400 pointer-events-none">
                        Delhi NCR
                    </div>
                </div>

                {/* LEGEND & INFO */}
                <div className="flex-1 space-y-4">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900">Regional Risk Heat Map</h3>
                        <p className="text-xs text-slate-500 mt-1">Geographic distribution of priority severity across administrative zones. Regions outside your jurisdiction are grayed out.</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 border border-red-600 rounded-sm"></div> Critical Risk (&gt;55)</span>
                            <span className="font-mono text-slate-500">
                                {ZONES.filter(z => (!userZone || userZone === "All Delhi" || userZone === z.id) && zoneData[z.id].avg > 55).length} zones
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-400 border border-amber-500 rounded-sm"></div> Elevated Risk (45-55)</span>
                            <span className="font-mono text-slate-500">
                                {ZONES.filter(z => (!userZone || userZone === "All Delhi" || userZone === z.id) && zoneData[z.id].avg >= 45 && zoneData[z.id].avg <= 55).length} zones
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-400 border border-emerald-500 rounded-sm"></div> Stable (&lt;45)</span>
                            <span className="font-mono text-slate-500">
                                {ZONES.filter(z => (!userZone || userZone === "All Delhi" || userZone === z.id) && zoneData[z.id].avg > 0 && zoneData[z.id].avg < 45).length} zones
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs opacity-50">
                            <span className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-100 border border-slate-300 rounded-sm"></div> No Data / Restricted</span>
                            <span className="font-mono text-slate-400">
                                {ZONES.filter(z => (userZone && userZone !== "All Delhi" && userZone !== z.id) || zoneData[z.id].avg === 0).length} zones
                            </span>
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
