/*
 * Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
(function (server) {
    var log = new Log();

    var login = function (url, username, password) {
        var res, options, payload,
            ws = require('ws'),
            client = new ws.WSRequest(),
            host = url.match(/.*:\/\/([^:\/]*)/)[1];

        options = {
            useSOAP: 1.2,
            useWSA: 1.0,
            action: 'urn:login'
        };

        payload =
            <aut:login xmlns:aut="http://authentication.services.core.carbon.wso2.org">
                <aut:username>{username}</aut:username>
                <aut:password>{password}</aut:password>
                <aut:remoteAddress>{host}</aut:remoteAddress>
            </aut:login>;

        try {
            client.open(options, url + '/services/AuthenticationAdmin', false);
            client.send(payload);
            res = client.responseXML;
            if (res.*::["return"].text() != 'true') {
                return false;
            }
            return client.getResponseHeader('Set-Cookie');
        } catch (e) {
            log.error(e.toString());
            throw new Error('Error while login to the server : ' + url + ', user : ' + username);
        }
    };

    var logout = function (url, cookie) {
        var options,
            ws = require('ws'),
            client = new ws.WSRequest();

        options = {
            useSOAP: 1.2,
            useWSA: 1.0,
            action: 'urn:logout',
            mep: 'in-only',
            HTTPHeaders: [
                { name: 'Cookie', value: cookie }
            ]
        };

        try {
            client.open(options, url + '/services/AuthenticationAdmin', false);
            client.send(null);
            return true;
        } catch (e) {
            log.error(e.toString());
            throw new Error('Error while logging out in server : ' + url + ', cookie : ' + cookie);
        }
    };

    var Cookie = function (cookie) {
        this.cookie = cookie;
    };

    server.Cookie = Cookie;

    var Server = function (url) {
        this.url = url || 'local:/';
    };
    server.Server = Server;

    Server.prototype.authenticate = function (username, password) {
        var realmService = server.osgiService('org.wso2.carbon.user.core.service.RealmService'),
            tenantId = server.tenantId({
                username: username
            }),
            realm = realmService.getTenantUserRealm(tenantId);
        return realm.getUserStoreManager().authenticate(getTenantAwareUsername(username), password);
    };
        var getTenantAwareUsername = function (username) {		
		var tenantAwareUsername = username;
		if (username.indexOf("@") != -1) {
		    tenantAwareUsername = username.substring(0, username.lastIndexOf('@'));
		}
		return tenantAwareUsername;
	};
    Server.prototype.login = function (username, password) {
        var cookie = login(this.url, username, password);
        return new Cookie(cookie);
    };

    Server.prototype.logout = function (cookie) {
        return logout(this.url, cookie.cookie);
    };
}(server));
