import { uniqueId } from 'lodash';

interface MenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: MenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
}
import {
  // IconAward,
  // IconBoxMultiple,
  // IconPoint,
  // IconAlertCircle,
  // IconNotes,
  IconCalendar,
  // IconMail,
  IconTicket,
  // IconEdit,
  // IconCurrencyDollar,
  // IconApps,
  // IconFileDescription,
  // IconFileDots,
  // IconFiles,
  // IconBan,
  // IconStar,
  // IconMoodSmile,
  // IconBorderAll,
  // IconBorderHorizontal,
  // IconBorderInner,
  // IconBorderVertical,
  // IconBorderTop,
  IconUserCircle,
  // IconPackage,
  IconMessage2,
  // IconBasket,
  // IconChartLine,
  // IconChartArcs,
  // IconChartCandle,
  // IconChartArea,
  // IconChartDots,
  // IconChartDonut3,
  // IconChartRadar,
  // IconLogin,
  // IconUserPlus,
  // IconRotate,
  // IconBox,
  // IconShoppingCart,
  // IconAperture,
  // IconLayout,
  // IconSettings,
  IconHelp,
  // IconZoomCode,
  // IconBoxAlignBottom,
  // IconBoxAlignLeft,
  // IconBorderStyle2,
  // IconAppWindow,
  IconNotebook,
  IconPlus,
  // IconFileCheck,
  // IconChartHistogram,
  // IconChartPie2,
  // IconChartScatter,
  // IconChartPpf,
  // IconChartArcs3,
  // IconListTree,
} from '@tabler/icons-react';

const Menuitems: MenuitemsType[] = [
  {
    navlabel: true,
    subheader: 'Страницы',
  },
  {
    id: uniqueId(),
    title: 'Профиль',
    icon: IconUserCircle,
    href: '/pages/account-settings',
  },
  {
    id: uniqueId(),
    title: 'Чаты по заказам',
    icon: IconMessage2,
    href: '/apps/chats',
  },
  // {
  //   id: uniqueId(),
  //   title: 'Профиль',
  //   icon: IconUserCircle,
  //   href: '/user-profile',
  // },
  {
    id: uniqueId(),
    title: 'Календарь',
    icon: IconCalendar,
    href: '/apps/calendar',
  },
  {
    id: uniqueId(),
    title: 'Заказы',
    icon: IconTicket,
    href: '/apps/tickets',
  },
  // {
  //   id: uniqueId(),
  //   title: 'Канбан доска',
  //   icon: IconNotebook,
  //   href: '/apps/kanban',
  // },
  // {
  //   id: uniqueId(),
  //   title: 'FAQ',
  //   icon: IconHelp,
  //   href: '/pages/faq',
  // },
  // {
  //   id: uniqueId(),
  //   title: 'Form Elements',
  //   icon: IconApps,
  //   href: '/forms/form-elements/autocomplete',
  //   children: [
  //     {
  //       id: uniqueId(),
  //       title: 'Autocomplete',
  //       icon: IconPoint,
  //       href: '/forms/form-elements/autocomplete',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Button',
  //       icon: IconPoint,
  //       href: '/forms/form-elements/button',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Checkbox',
  //       icon: IconPoint,
  //       href: '/forms/form-elements/checkbox',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Radio',
  //       icon: IconPoint,
  //       href: '/forms/form-elements/radio',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Date Time',
  //       icon: IconPoint,
  //       href: '/forms/form-elements/date-time',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Slider',
  //       icon: IconPoint,
  //       href: '/forms/form-elements/slider',
  //     },
  //     {
  //       id: uniqueId(),
  //       title: 'Switch',
  //       icon: IconPoint,
  //       href: '/forms/form-elements/switch',
  //     },
  //   ],
  // },
//   {
//     id: uniqueId(),
//     title: 'Form Layout',
//     icon: IconFileDescription,
//     href: '/forms/form-layouts',
//   },
//   {
//     id: uniqueId(),
//     title: 'Form Horizontal',
//     icon: IconBoxAlignBottom,
//     href: '/forms/form-horizontal',
//   },
//   {
//     id: uniqueId(),
//     title: 'Form Vertical',
//     icon: IconBoxAlignLeft,
//     href: '/forms/form-vertical',
//   },
//   {
//     id: uniqueId(),
//     title: 'Form Custom',
//     icon: IconFileDots,
//     href: '/forms/form-custom',
//   },
//   {
//     id: uniqueId(),
//     title: 'Form Wizard',
//     icon: IconFiles,
//     href: '/forms/form-wizard',
//   },
//   {
//     id: uniqueId(),
//     title: 'Form Validation',
//     icon: IconFiles,
//     href: '/forms/form-validation',
//   },
//   {
//     id: uniqueId(),
//     title: 'Tiptap Editor',
//     icon: IconEdit,
//     href: '/forms/form-tiptap',
//   },
//   {
//     navlabel: true,
//     subheader: 'Tables',
//   },
//   {
//     id: uniqueId(),
//     title: 'Basic',
//     icon: IconBorderAll,
//     href: '/tables/basic',
//   },
//   {
//     id: uniqueId(),
//     title: 'Collapsible',
//     icon: IconBorderHorizontal,
//     href: '/tables/collapsible',
//   },
//   {
//     id: uniqueId(),
//     title: 'Enhanced',
//     icon: IconBorderInner,
//     href: '/tables/enhanced',
//   },
//   {
//     id: uniqueId(),
//     title: 'Fixed Header',
//     icon: IconBorderVertical,
//     href: '/tables/fixed-header',
//   },
//   {
//     id: uniqueId(),
//     title: 'Pagination',
//     icon: IconBorderTop,
//     href: '/tables/pagination',
//   },
//   {
//     id: uniqueId(),
//     title: 'Search',
//     icon: IconBorderStyle2,
//     href: '/tables/search',
//   },
//   {
//     id: uniqueId(),
//     title: 'React Table',
//     icon: IconBorderStyle2,
//     href: '/react-tables/basic',
//     children: [
//       {
//         id: uniqueId(),
//         title: 'Basic',
//         icon: IconPoint,
//         href: '/react-tables/basic',
//       },
//       {
//         id: uniqueId(),
//         title: 'Dense',
//         icon: IconPoint,
//         href: '/react-tables/dense',
//       },
//       {
//         id: uniqueId(),
//         title: 'Filter',
//         icon: IconPoint,
//         href: '/react-tables/filter',
//       },
//       {
//         id: uniqueId(),
//         title: 'Row Selection',
//         icon: IconPoint,
//         href: '/react-tables/row-selection',
//       },
//       {
//         id: uniqueId(),
//         title: 'Pagination',
//         icon: IconPoint,
//         href: '/react-tables/pagination',
//       },
//       {
//         id: uniqueId(),
//         title: 'Sorting',
//         icon: IconPoint,
//         href: '/react-tables/sorting',
//       },
//       {
//         id: uniqueId(),
//         title: 'Column Visibility',
//         icon: IconPoint,
//         href: '/react-tables/column-visiblity',
//       },
//       {
//         id: uniqueId(),
//         title: 'Editable',
//         icon: IconPoint,
//         href: '/react-tables/editable',
//       },
//       {
//         id: uniqueId(),
//         title: 'Expanding',
//         icon: IconPoint,
//         href: '/react-tables/expanding',
//       },
//       {
//         id: uniqueId(),
//         title: 'Sticky',
//         icon: IconPoint,
//         href: '/react-tables/sticky',
//       },
//       {
//         id: uniqueId(),
//         title: 'Empty',
//         icon: IconPoint,
//         href: '/react-tables/empty',
//       },
//       {
//         id: uniqueId(),
//         title: 'Drag & Drop',
//         icon: IconPoint,
//         href: '/react-tables/drag-drop',
//       },
//     ],
//   },
//   {
//     navlabel: true,
//     subheader: 'Mui Charts',
//   },

//   {
//     id: uniqueId(),
//     title: 'BarCharts',
//     icon: IconChartHistogram,
//     href: '/muicharts/barcharts',
//   },
//   {
//     id: uniqueId(),
//     title: 'LineCharts',
//     icon: IconChartLine,
//     href: '/muicharts/linecharts/line',
//     children: [
//       {
//         id: uniqueId(),
//         title: 'Lines',
//         icon: IconPoint,
//         href: '/muicharts/linecharts/line',
//       },
//       {
//         id: uniqueId(),
//         title: 'Area',
//         icon: IconPoint,
//         href: '/muicharts/linecharts/area',
//       },
//     ],
//   },
//   {
//     id: uniqueId(),
//     title: 'PieCharts',
//     icon: IconChartPie2,
//     href: '/muicharts/piecharts',
//   },
//   {
//     id: uniqueId(),
//     title: 'ScatterCharts',
//     icon: IconChartScatter,
//     href: '/muicharts/scattercharts',
//   },
//   {
//     id: uniqueId(),
//     title: 'SparklineCharts',
//     icon: IconChartPpf,
//     href: '/muicharts/sparklinecharts',
//   },
//   {
//     id: uniqueId(),
//     title: 'GaugeCharts',
//     icon: IconChartArcs3,
//     href: '/muicharts/gaugecharts',
//   },

//   {
//     navlabel: true,
//     subheader: 'Mui Trees',
//   },
//   {
//     id: uniqueId(),
//     title: 'SimpleTreeView',
//     icon: IconListTree,
//     href: '/mui-trees/simpletree/simpletree-items',
//     children: [
//       {
//         id: uniqueId(),
//         title: 'Items',
//         icon: IconPoint,
//         href: '/mui-trees/simpletree/simpletree-items',
//       },
//       {
//         id: uniqueId(),
//         title: 'Selection',
//         icon: IconPoint,
//         href: '/mui-trees/simpletree/simpletree-selection',
//       },
//       {
//         id: uniqueId(),
//         title: 'Expansion',
//         icon: IconPoint,
//         href: '/mui-trees/simpletree/simpletree-expansion',
//       },
//       {
//         id: uniqueId(),
//         title: 'Customization',
//         icon: IconPoint,
//         href: '/mui-trees/simpletree/simpletree-customization',
//       },
//       {
//         id: uniqueId(),
//         title: 'Focus',
//         icon: IconPoint,
//         href: '/mui-trees/simpletree/simpletree-focus',
//       },
//     ],
//   },
//   {
//     navlabel: true,
//     subheader: 'UI',
//   },
//   {
//     id: uniqueId(),
//     title: 'Ui Components',
//     icon: IconBox,
//     href: '/ui-components/alert',
//     children: [
//       {
//         id: uniqueId(),
//         title: 'Alert',
//         icon: IconPoint,
//         href: '/ui-components/alert',
//       },
//       {
//         id: uniqueId(),
//         title: 'Accordion',
//         icon: IconPoint,
//         href: '/ui-components/accordion',
//       },
//       {
//         id: uniqueId(),
//         title: 'Avatar',
//         icon: IconPoint,
//         href: '/ui-components/avatar',
//       },
//       {
//         id: uniqueId(),
//         title: 'Chip',
//         icon: IconPoint,
//         href: '/ui-components/chip',
//       },
//       {
//         id: uniqueId(),
//         title: 'Dialog',
//         icon: IconPoint,
//         href: '/ui-components/dialog',
//       },
//       {
//         id: uniqueId(),
//         title: 'List',
//         icon: IconPoint,
//         href: '/ui-components/list',
//       },
//       {
//         id: uniqueId(),
//         title: 'Popover',
//         icon: IconPoint,
//         href: '/ui-components/popover',
//       },
//       {
//         id: uniqueId(),
//         title: 'Rating',
//         icon: IconPoint,
//         href: '/ui-components/rating',
//       },
//       {
//         id: uniqueId(),
//         title: 'Tabs',
//         icon: IconPoint,
//         href: '/ui-components/tabs',
//       },
//       {
//         id: uniqueId(),
//         title: 'Tooltip',
//         icon: IconPoint,
//         href: '/ui-components/tooltip',
//       },
//       {
//         id: uniqueId(),
//         title: 'Transfer List',
//         icon: IconPoint,
//         href: '/ui-components/transfer-list',
//       },
//       {
//         id: uniqueId(),
//         title: 'Typography',
//         icon: IconPoint,
//         href: '/ui-components/typography',
//       },
//     ],
//   },

//   {
//     navlabel: true,
//     subheader: 'Charts',
//   },
//   {
//     id: uniqueId(),
//     title: 'Line',
//     icon: IconChartLine,
//     href: '/charts/line-chart',
//   },
//   {
//     id: uniqueId(),
//     title: 'Gredient',
//     icon: IconChartArcs,
//     href: '/charts/gredient-chart',
//   },
//   {
//     id: uniqueId(),
//     title: 'Area',
//     icon: IconChartArea,
//     href: '/charts/area-chart',
//   },
//   {
//     id: uniqueId(),
//     title: 'Candlestick',
//     icon: IconChartCandle,
//     href: '/charts/candlestick-chart',
//   },
//   {
//     id: uniqueId(),
//     title: 'Column',
//     icon: IconChartDots,
//     href: '/charts/column-chart',
//   },
//   {
//     id: uniqueId(),
//     title: 'Doughtnut & Pie',
//     icon: IconChartDonut3,
//     href: '/charts/doughnut-pie-chart',
//   },
//   {
//     id: uniqueId(),
//     title: 'RadialBar & Radar',
//     icon: IconChartRadar,
//     href: '/charts/radialbar-chart',
//   },
//   {
//     navlabel: true,
//     subheader: 'Auth',
//   },

//   {
//     id: uniqueId(),
//     title: 'Login',
//     icon: IconLogin,
//     href: '/auth/login',
//     children: [
//       {
//         id: uniqueId(),
//         title: 'Side Login',
//         icon: IconPoint,
//         href: '/auth/login',
//       },
//       {
//         id: uniqueId(),
//         title: 'Boxed Login',
//         icon: IconPoint,
//         href: '/auth/login2',
//       },
//     ],
//   },
//   {
//     id: uniqueId(),
//     title: 'Register',
//     icon: IconUserPlus,
//     href: '/auth/register',
//     children: [
//       {
//         id: uniqueId(),
//         title: 'Side Register',
//         icon: IconPoint,
//         href: '/auth/register',
//       },
//       {
//         id: uniqueId(),
//         title: 'Boxed Register',
//         icon: IconPoint,
//         href: '/auth/register2',
//       },
//     ],
//   },
//   {
//     id: uniqueId(),
//     title: 'Forgot Password',
//     icon: IconRotate,
//     href: '/auth/forgot-password',
//     children: [
//       {
//         id: uniqueId(),
//         title: 'Side Forgot Password',
//         icon: IconPoint,
//         href: '/auth/forgot-password',
//       },
//       {
//         id: uniqueId(),
//         title: 'Boxed Forgot Password',
//         icon: IconPoint,
//         href: '/auth/forgot-password2',
//       },
//     ],
//   },

//   {
//     id: uniqueId(),
//     title: 'Two Steps',
//     icon: IconZoomCode,
//     href: '/auth/two-steps',
//     children: [
//       {
//         id: uniqueId(),
//         title: 'Side Two Steps',
//         icon: IconPoint,
//         href: '/auth/two-steps',
//       },
//       {
//         id: uniqueId(),
//         title: 'Boxed Two Steps',
//         icon: IconPoint,
//         href: '/auth/two-steps2',
//       },
//     ],
//   },
//   {
//     id: uniqueId(),
//     title: 'Error',
//     icon: IconAlertCircle,
//     href: '/400',
//   },
//   {
//     id: uniqueId(),
//     title: 'Maintenance',
//     icon: IconSettings,
//     href: '/auth/maintenance',
//   },

//   {
//     navlabel: true,
//     subheader: 'Other',
//   },
//   {
//     id: uniqueId(),
//     title: 'Menu Level',
//     icon: IconBoxMultiple,
//     href: '/menulevel/',
//     children: [
//       {
//         id: uniqueId(),
//         title: 'Level 1',
//         icon: IconPoint,
//         href: '/l1',
//       },
//       {
//         id: uniqueId(),
//         title: 'Level 1.1',
//         icon: IconPoint,
//         href: '/l1.1',
//         children: [
//           {
//             id: uniqueId(),
//             title: 'Level 2',
//             icon: IconPoint,
//             href: '/l2',
//           },
//           {
//             id: uniqueId(),
//             title: 'Level 2.1',
//             icon: IconPoint,
//             href: '/l2.1',
//             children: [
//               {
//                 id: uniqueId(),
//                 title: 'Level 3',
//                 icon: IconPoint,
//                 href: '/l3',
//               },
//               {
//                 id: uniqueId(),
//                 title: 'Level 3.1',
//                 icon: IconPoint,
//                 href: '/l3.1',
//               },
//             ],
//           },
//         ],
//       },
//     ],
//   },
//   {
//     id: uniqueId(),
//     title: 'Disabled',
//     icon: IconBan,
//     href: '/',
//     disabled: true,
//   },
//   {
//     id: uniqueId(),
//     title: 'SubCaption',
//     subtitle: 'This is the sutitle',
//     icon: IconStar,
//     href: '/',
//   },

//   {
//     id: uniqueId(),
//     title: 'Chip',
//     icon: IconAward,
//     href: '/',
//     chip: '9',
//     chipColor: 'primary',
//   },
//   {
//     id: uniqueId(),
//     title: 'Outlined',
//     icon: IconMoodSmile,
//     href: '/',
//     chip: 'outline',
//     variant: 'outlined',
//     chipColor: 'primary',
//   },
//   {
//     id: uniqueId(),
//     title: 'External Link',
//     external: true,
//     icon: IconStar,
//     href: 'https://google.com',
//   },
];

export default Menuitems;
