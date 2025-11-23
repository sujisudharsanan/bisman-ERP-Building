const pkg = require('lucide-react');
const names = ['LogOut','RefreshCw','Database','CheckCircle','Circle','Users','Key','FileText','Eye','EyeOff','ExternalLink','Download','Search','Filter','AlertTriangle','TrendingUp','Package'];
names.forEach(n => {
  const v = pkg[n];
  console.log(n, typeof v, !!v);
});
console.log('total exports', Object.keys(pkg).length);
